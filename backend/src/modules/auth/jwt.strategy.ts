import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { env } from '../../config/env';
import { AuthenticatedUser, JwtPayload } from '../../common/interfaces';
import { User } from '../../database/entities/user.entity';
import { toUserView } from './auth.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwtAccessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.team', 'team')
      .where('user.id = :id', { id: payload.sub })
      .andWhere('user.isActive = :active', { active: true })
      .getOne();
    if (!user) throw new UnauthorizedException('Invalid authentication token');
    return toUserView(user);
  }
}
