import chalk from "chalk";
import fs from "fs";
import path from "path";
import FileNotFoundException from "./exceptions/FileNotFoundException";

/**
 * Handle errors
 * @param error
 */
export function handleError(error: Error) {
    if (error.message) {
        console.error(`${chalk.red(error.message)}\n`);
    }
    if (error.stack) {
        console.log(error.stack);
    }
    process.exit(1);
}

/**
 * Resolve relative path
 * @param relativePath
 * @param strict if true returns
 */
export function resolvePath(relativePath: string, strict: boolean = true): string {
    const absolutePath = path.resolve(fs.realpathSync(process.cwd()), relativePath);
    if (strict && !fs.existsSync(absolutePath)) {
        throw new FileNotFoundException(`No such file or directory ${absolutePath}.`);
    }
    return absolutePath;
}

/**
 * Sleep application for a given time
 * @param milliseconds
 */
export function sleep(milliseconds: number) {
    const start = new Date().getTime();
    for (let i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}
