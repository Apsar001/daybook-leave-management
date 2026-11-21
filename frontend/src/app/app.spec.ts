import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App shell smoke test', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('creates the root component', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a router outlet without requiring API data', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const outlet = (fixture.nativeElement as HTMLElement).querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });
});
