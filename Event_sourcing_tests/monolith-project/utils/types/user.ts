// User Class
export class User {
    id: string;
    username: string;
    email: string;
    password: string;
    salt: string;
    role: string;

    constructor(id: string, username: string, email: string, password: string, salt: string, role: string) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.salt = salt;
        this.role = role;
    }
}
