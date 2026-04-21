import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
      scope: ['email'],
      profileFields: ['id', 'displayName', 'emails', 'photos'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: Profile, done: Function) {
    const { id, displayName, emails, photos } = profile;
    done(null, {
      facebookId: id,
      name: displayName,
      email: emails?.[0]?.value,
      avatar: photos?.[0]?.value,
    });
  }
}
