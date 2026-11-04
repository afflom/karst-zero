const notInBrowser = () => {
  throw new Error('Node-only API cannot be called in browser runtime.');
};

export const readFile = notInBrowser;
export const readdir = notInBrowser;
export const stat = notInBrowser;
export const createServer = notInBrowser;
export const resolve = notInBrowser;
export const join = notInBrowser;
export const extname = notInBrowser;
export const pathToFileURL = notInBrowser;
export const fileURLToPath = notInBrowser;
export const fromFile = notInBrowser;
export const readClosureDirectory = notInBrowser;
export const serve = notInBrowser;

export default {
  readFile,
  readdir,
  stat,
  createServer,
  resolve,
  join,
  extname,
  pathToFileURL,
  fileURLToPath,
  fromFile,
  readClosureDirectory,
  serve,
};
