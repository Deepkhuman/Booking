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
      profileFields: ['id', 'displayName', 'photos'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: Profile, done: Function) {
    const { id, displayName, photos } = profile;
    done(null, {
      facebookId: id,
      name: displayName,
      email: `fb_${id}@plugin.com`,
      avatar: photos?.[0]?.value,
    });
  }
}
