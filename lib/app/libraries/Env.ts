import dotenv from "dotenv";
import NodeProcessException from "../exceptions/NodeProcessException";

export interface Environments {
    development?: object;
    production?: object;
    test?: object;
}

/**
 * Define required keys here
 */
export interface DefaultEnv extends NodeJS.ProcessEnv {
    BABEL_ENV: string;
    BUILD_PATH: string;
    HOST: string;
    PORT: string;
    PROTOCOL: string;
    PUBLIC_URL: string;
    NODE_ENV: string;
    NODE_PATH: string;
}

class Env {

    /**
     * Defualt values for env
     */
    public static defaultValues: DefaultEnv = {
        BABEL_ENV: "",
        BUILD_PATH: "",
        HOST: "",
        NODE_ENV: "",
        NODE_PATH: "",
        PORT: "",
        PROTOCOL: "",
        PUBLIC_URL: "",
    };

    /**
     * Get current enviroment
     */
    public static get current(): Environment {
        return Env.config("NODE_ENV", "production") as Environment;
    }

    /**
     * Get entire env, get by key or set by key
     * @description Values will always be read in as a string. All casting must happen afterward.
     * @param key
     * @param defaultValue
     */
    public static config(): NodeJS.ProcessEnv;
    public static config(key: string): string | undefined;
    public static config(key: string, defaultValue: string): string;
    public static config(key?: string, defaultValue?: string): NodeJS.ProcessEnv | string | undefined {
        if (key && process.env.hasOwnProperty(key)) {
            const value = process.env[key];
            return !value
                ? defaultValue
                : value;
        }
        return process.env;
    }

    /**
     * Set value on env
     * @param key
     * @param value
     */
    public static define(key: string, value: string): void {
        process.env[key] = value;
    }

    /**
     * Load from file for specific enviroment
     * @description Check env and setup defualt keys
     */
    public static load(enviroment?: Environment): void {
        if (!process) {
            throw new NodeProcessException("Node process is undefined.");
        }
        if (!process.env) {
            throw new NodeProcessException("Node enviromental variables are undefined.");
        }
        dotenv.config();
        if (enviroment) {
            process.env = Object.assign(Env.defaultValues, process.env, {
                BABEL_ENV: enviroment,
                NODE_ENV: enviroment,
            });
        } else {
            process.env = Object.assign(Env.defaultValues, process.env);
        }
    }
}

export default Env;
