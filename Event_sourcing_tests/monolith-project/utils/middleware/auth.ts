import { verifyJWT } from "./token";

export function verifyToken(req: any, res: any)  {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).send("No token provided");
    }

    const decoded = verifyJWT(token);

    if (decoded === "Invalid token") {
        return res.status(401).send("Invalid token");
    }

    const { role, email: added_by, exp } = decoded as any;

    // For no expiration, used by services
    if (exp === undefined) {
        return decoded;
    }

    if (exp < Date.now().valueOf() / 1000) {
        return res.status(401).send("Token has expired");
    }

    return decoded;
}

export function verifyUser(req: any, res: any, next: any) {
    const { email } = verifyToken(req, res) as any;
    
    const user = req.params.email;

    if (email !== user) {
        return res.status(403).send("Unauthorized");
    }

    next();
}

export function verifyUserOrAdmin(req: any, res: any, next: any) {
    const { role, email } = verifyToken(req, res) as any;
    const user = req.params.email;

    if (email !== user && role !== "admin") {
        return res.status(403).send("Unauthorized");
    }

    next();
}
    

export function verifyAdmin(req: any, res: any, next: any) {
    const { role } = verifyToken(req, res) as any;

    if (role !== "admin") {
        return res.status(403).send("Unauthorized");
    }

    next();
}

