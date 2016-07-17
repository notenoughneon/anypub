// type Config = {
//         type: "file";
//         root: string;
//     } |
//     {
//        type: "git";
//        root: string;
//        push: boolean;
//     } |
//     {
//         type: "s3";
//         region: string;
//         bucket: string;
//     } |
//     {
//         type: 'mirror';
//         primary: Config;
//         secondary: Config;
//     };

abstract class Publisher {
    abstract put(path: string, obj: string | NodeJS.ReadableStream, contentType?: string): Promise<void>;
    abstract delete(path: string, contentType: string): Promise<void>;
    abstract get(path: string): Promise<{Body: Buffer, ContentType: string}>;
    abstract exists(path: string): Promise<boolean>;
    abstract list(): Promise<string[]>;
    abstract rollback(): Promise<void>;
    abstract commit(msg: string): Promise<void>;
    
}

export default Publisher;