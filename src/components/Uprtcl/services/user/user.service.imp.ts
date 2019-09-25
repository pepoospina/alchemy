import { UserService } from "../user.service";

export class UserServiceImp implements UserService {
  private username: string;

  setUsername(_username: string): void {
    this.username = _username;
  }
  getUsername(): string {
    return this.username ? this.username : 'anonymous:02'
  }
}

export const userService = new UserServiceImp()
