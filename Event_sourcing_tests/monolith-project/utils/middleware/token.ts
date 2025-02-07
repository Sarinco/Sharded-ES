import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

console.log("JWT_SECRET: ", JWT_SECRET);

if (JWT_SECRET === '') {
    console.error("JWT_SECRET is not set");
}

// Generate a JWT token
export function generateJWT(email: string, role: string): string {
    let token = sign({
        email: email,
        role: role
    }, JWT_SECRET, { expiresIn: '24h' });
    return token;
}

// Verify a JWT token
export function verifyJWT(token: string): string | object {
    try {
        const decoded = verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error("Error in verifyJWT: ", error);
        return "Invalid token";
    }
}
