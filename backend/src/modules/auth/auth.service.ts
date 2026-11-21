import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { env, parseDuration } from '../../config/env';
import { AuthenticatedUser, JwtPayload } from '../../common/interfaces';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { User } from '../../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { hashToken, newJti, toUserView } from './auth.util';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.team', 'team')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email.trim() })
      .getOne();

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(user);
  }

  private async issueTokens(
    user: User,
    manager?: EntityManager,
  ): Promise<TokenResponse> {
    const jti = newJti();
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      managerId: user.managerId,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: env.jwtAccessSecret,
      expiresIn: parseDuration(env.jwtAccessTtl),
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti },
      {
        secret: env.jwtRefreshSecret,
        expiresIn: parseDuration(env.jwtRefreshTtl),
      },
    );

    const stored = this.refreshTokens.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + parseDuration(env.jwtRefreshTtl) * 1000),
      revokedAt: null,
    });
    const repository = manager
      ? manager.getRepository(RefreshToken)
      : this.refreshTokens;
    await repository.save(stored);

    return {
      accessToken,
      refreshToken,
      expiresIn: parseDuration(env.jwtAccessTtl),
      user: toUserView(user),
    };
  }

  async refresh(dto: RefreshDto): Promise<TokenResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: env.jwtRefreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(dto.refreshToken);
    let response: TokenResponse | undefined;
    let replayDetected = false;

    await this.dataSource.transaction(async (manager) => {
      const tokenRepository = manager.getRepository(RefreshToken);
      const query = tokenRepository
        .createQueryBuilder('token')
        .where('token.token_hash = :tokenHash', { tokenHash });
      if (
        (manager.connection.options as { type?: string }).type === 'postgres'
      ) {
        query.setLock('pessimistic_write');
      }
      const stored = await query.getOne();

      if (!stored || stored.expiresAt.getTime() < Date.now()) {
        throw new UnauthorizedException(
          'Refresh token has been revoked or expired',
        );
      }
      if (stored.revokedAt) {
        // A rotated token being replayed means it may have been stolen. Revoke
        // every active token for that user. The failure is raised after commit so
        // the revocation itself is not rolled back with the transaction.
        await tokenRepository
          .createQueryBuilder()
          .update(RefreshToken)
          .set({ revokedAt: new Date() })
          .where('user_id = :userId', { userId: stored.userId })
          .andWhere('revoked_at IS NULL')
          .execute();
        replayDetected = true;
        return;
      }

      const user = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.team', 'team')
        .where('user.id = :id', { id: payload.sub })
        .andWhere('user.isActive = :active', { active: true })
        .getOne();
      if (!user) throw new UnauthorizedException('User is no longer active');

      stored.revokedAt = new Date();
      await tokenRepository.save(stored);
      response = await this.issueTokens(user, manager);
    });

    if (replayDetected) {
      throw new UnauthorizedException('Refresh token has already been rotated');
    }
    return response!;
  }

  async logout(dto: RefreshDto): Promise<{ success: boolean }> {
    const tokenHash = hashToken(dto.refreshToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      stored.revokedAt = new Date();
      await this.refreshTokens.save(stored);
    }
    return { success: true };
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.team', 'team')
      .where('user.id = :id', { id: userId })
      .andWhere('user.isActive = :active', { active: true })
      .getOne();
    if (!user) throw new UnauthorizedException('User not found');
    return toUserView(user);
  }
}
