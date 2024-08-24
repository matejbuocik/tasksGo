import axios from "axios";

export const login = async (user: { name: string, pass: string }) => {
    const res = await axios.post("https://localhost:8080/login", user, { withCredentials: true });
    if (res.status !== 200) {
        if (res.status === 401) {
            throw new Error("Login not succesful.");
        }
        throw new Error("Something went wrong.")
    }
    return res.data as string;
}

export const logout = async () => {
    const res = await axios.post("https://localhost:8080/logout", undefined, { withCredentials: true });
    if (res.status !== 200) {
        if (res.status === 401) {
            throw new Error("Logout not succesful");
        }
        throw new Error("Something went wrong");
    }
}