import User from '#models/user';

export class UserDto {
  constructor(private user: User) {}

  toJson() {
    return {
      id: this.user.id,
      email: this.user.email,
      fullName: this.user.fullName,
    };
  }
}
