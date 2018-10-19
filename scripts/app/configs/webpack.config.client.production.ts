// TODO remove these eventually
/* tslint:disable object-literal-sort-keys */
/* tslint:disable no-var-requires */
import autoprefixer from "autoprefixer";
import ExtractTextPlugin from "extract-text-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import InterpolateHtmlPlugin from "react-dev-utils/InterpolateHtmlPlugin";
import ModuleScopePlugin from "react-dev-utils/ModuleScopePlugin";
import SWPrecacheWebpackPlugin from "sw-precache-webpack-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import UglifyJsPlugin from "uglifyjs-webpack-plugin";
import webpack, {DevtoolModuleFilenameTemplateInfo} from "webpack";
import ManifestPlugin from "webpack-manifest-plugin";
import Application from "../Application";
import Env from "./env";
import files from "./files";

/**
 * Stringify all values so we can feed into Webpack DefinePlugin
 * @type Object
 */
const env = Env.config();
const definePluginSettings = {
    "process.env": Object.keys(env).reduce((values, key) => {
            values[key] = JSON.stringify(env[key]);
            return values;
        }, {},
    ),
};

/**
 * Webpack uses `publicPath` to determine where the app is being served from.
 * It requires a trailing slash, or the file assets will get an incorrect path.
 */
const publicPath = Application.servedPath;
/**
 * publicUrl is just like `publicPath`, but we will provide it to our app
 * as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript
 * Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
 */
const publicUrl = publicPath.slice(0, -1);

/**
 * Some apps do not use client-side routing with pushState.
 * For these, "homepage" can be set to "." to enable relative asset paths.
 * @type {boolean}
 */
const shouldUseRelativeAssetPaths = publicPath === "./";

/**
 * Source maps are resource heavy and can cause out of memory issue for large source files.
 * @type {boolean}
 */
const shouldUseSourceMap = env.GENERATE_SOURCE_MAP !== "false";

/**
 * Assert this just to be safe.
 */
if (Env.current !== "production") {
    throw new Error("Production builds must have NODE_ENV=production.");
}

/**
 * Create extract text plugin options
 */
const extractTextPluginOptions = shouldUseRelativeAssetPaths
    ? // Making sure that the publicPath goes back to to build folder.
    { publicPath: Array(files.outputPattern.css.split("/").length).join("../") }
    : {};

const postCssPlugin = () => [
    require("postcss-flexbugs-fixes"),
    autoprefixer({
        browsers: [
            ">1%",
            "last 4 versions",
            "Firefox ESR",
            "not ie < 9", // React doesn't support IE8 anyway
        ],
        flexbox: "no-2009",
    }),
];

const clientConfig = {
    // Don't attempt to continue if there are any errors.
    bail: true,
    // We generate sourcemaps in production. This is slow but gives good results.
    // You can exclude the *.map files from the build during deployment.
    devtool: shouldUseSourceMap ? "source-map" : false,
    entry: [
        Application.clientEntryPoint,
    ],
    output: {
        path: Application.buildPath,
        filename: files.outputPattern.js,
        chunkFilename: files.outputPattern.jsChunk,
        // We inferred the "public path" (such as / or /my-project) from homepage.
        publicPath,
        // Point sourcemap entries to original disk location (format as URL on Windows)
        devtoolModuleFilenameTemplate: (info: DevtoolModuleFilenameTemplateInfo) =>
            path
                .relative(Application.srcPath, info.absoluteResourcePath)
                .replace(/\\/g, "/"),
    },
    module: {
        strictExportPresence: true,
        rules: [
            {
                test: /\.(js|jsx|mjs)$/,
                loader: require.resolve("source-map-loader"),
                enforce: "pre",
                include: Application.srcPath,
            },
            {
                // "oneOf" will traverse all following loaders until one will
                // match the requirements. When no loader matches it will fall
                // back to the "file" loader at the end of the loader list.
                oneOf: [
                    // "url" loader works just like "file" loader but it also embeds
                    // assets smaller than specified size as data URLs to avoid requests.
                    {
                        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                        loader: require.resolve("url-loader"),
                        options: {
                            limit: 10000,
                            name: "static/media/[name].[hash:8].[ext]",
                        },
                    },
                    {
                        test: /\.(js|jsx|mjs)$/,
                        include: Application.srcPath,
                        loader: require.resolve("babel-loader"),
                        options: {
                            compact: true,
                        },
                    },
                    {
                        test: /\.(ts|tsx)$/,
                        include: Application.srcPath,
                        use: [
                            {
                                loader: require.resolve("ts-loader"),
                                options: {
                                    // disable type checker - we will use it in fork plugin
                                    transpileOnly: true,
                                    configFile: Application.tsConfigProd,
                                },
                            },
                        ],
                    },
                    // The notation here is somewhat confusing.
                    // "postcss" loader applies autoprefixer to our CSS.
                    // "css" loader resolves paths in CSS and adds assets as dependencies.
                    // "style" loader normally turns CSS into JS modules injecting <style>,
                    // but unlike in development configuration, we do something different.
                    // `ExtractTextPlugin` first applies the "postcss" and "css" loaders
                    // (second argument), then grabs the result CSS and puts it into a
                    // separate file in our build process. This way we actually ship
                    // a single CSS file in production instead of JS code injecting <style>
                    // tags. If you use code splitting, however, any async bundles will still
                    // use the "style" loader inside the async code so CSS from them won't be
                    // in the main CSS file.
                    {
                        test: /\.css$/,
                        loader: ExtractTextPlugin.extract(
                            Object.assign(
                                {
                                    fallback: {
                                        loader: require.resolve("style-loader"),
                                        options: {
                                            hmr: false,
                                        },
                                    },
                                    use: [
                                        {
                                            loader: require.resolve("css-loader"),
                                            options: {
                                                importLoaders: 1,
                                                minimize: true,
                                                sourceMap: shouldUseSourceMap,
                                            },
                                        },
                                        {
                                            loader: require.resolve("postcss-loader"),
                                            options: {
                                                // Necessary for external CSS imports to work
                                                // https://github.com/facebookincubator/create-react-app/issues/2677
                                                ident: "postcss",
                                                plugins: postCssPlugin,
                                            },
                                        },
                                    ],
                                },
                                extractTextPluginOptions,
                            ),
                        ),
                        // Note: this won't work without `new ExtractTextPlugin()` in `plugins`.
                    },
                    // "file" loader makes sure assets end up in the `build` folder.
                    // When you `import` an asset, you get its filename.
                    // This loader doesn't use a "test" so it will catch all modules
                    // that fall through the other loaders.
                    {
                        loader: require.resolve("file-loader"),
                        // Exclude `js` files to keep "css" loader working as it injects
                        // it's runtime that would otherwise processed through "file" loader.
                        // Also exclude `html` and `json` extensions so they get processed
                        // by webpacks internal loaders.
                        exclude: [/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/],
                        options: {
                            name: "static/media/[name].[hash:8].[ext]",
                        },
                    },
                    // ** STOP ** Are you adding a new loader?
                    // Make sure to add the new loader(s) before the "file" loader.
                ],
            },
        ],
    },
    plugins: [
        // Makes some environment variables available in index.html.
        // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
        // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
        // In production, it will be an empty string unless you specify "homepage"
        // in `package.json`, in which case it will be the pathname of that URL.
        new InterpolateHtmlPlugin(env),
        // Generates an `index.html` file with the <script> injected.
        new HtmlWebpackPlugin({
            inject: true,
            template: Application.publicEntryPoint,
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true,
            },
        }),
        // Makes some environment variables available to the JS code, for example:
        // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
        // It is absolutely essential that NODE_ENV was set to production here.
        // Otherwise React will be compiled in the very slow development mode.
        new webpack.DefinePlugin(definePluginSettings),
        // Minify the code.
        new UglifyJsPlugin({
            uglifyOptions: {
                parse: {
                    // we want uglify-js to parse ecma 8 code. However we want it to output
                    // ecma 5 compliant code, to avoid issues with older browsers, this is
                    // whey we put `ecma: 5` to the compress and output section
                    // https://github.com/facebook/create-react-app/pull/4234
                    ecma: 8,
                },
                compress: {
                    ecma: 5,
                    warnings: false,
                    // Disabled because of an issue with Uglify breaking seemingly valid code:
                    // https://github.com/facebook/create-react-app/issues/2376
                    // Pending further investigation:
                    // https://github.com/mishoo/UglifyJS2/issues/2011
                    comparisons: false,
                },
                mangle: {
                    safari10: true,
                },
                output: {
                    ecma: 5,
                    comments: false,
                    // Turned on because emoji and regex is not minified properly using default
                    // https://github.com/facebook/create-react-app/issues/2488
                    ascii_only: true,
                },
            },
            // Use multi-process parallel running to improve the build speed
            // Default number of concurrent runs: os.cpus().length - 1
            parallel: true,
            // Enable file caching
            cache: true,
            sourceMap: shouldUseSourceMap,
        }), // Note: this won't work without ExtractTextPlugin.extract(..) in `loaders`.
        new ExtractTextPlugin({
            filename: files.outputPattern.css,
        }),
        // Generate a manifest file which contains a mapping of all asset filenames
        // to their corresponding output file so that tools can pick it up without
        // having to parse `index.html`.
        new ManifestPlugin({
            fileName: "asset-manifest.json",
        }),
        // Generate a service worker script that will precache, and keep up to date,
        // the HTML & assets that are part of the Webpack build.
        new SWPrecacheWebpackPlugin({
            // By default, a cache-busting query parameter is appended to requests
            // used to populate the caches, to ensure the responses are fresh.
            // If a URL is already hashed by Webpack, then there is no concern
            // about it being stale, and the cache-busting can be skipped.
            dontCacheBustUrlsMatching: /\.\w{8}\./,
            filename: "service-worker.js",
            logger: (message: string): void => {
                const totalPrecacheMsg = message.indexOf("Total precache size is") === 0;
                const skippingStaticResourceMsg = message.indexOf("Skipping static resource") === 0;
                if (!totalPrecacheMsg && !skippingStaticResourceMsg) {
                    console.log(message);
                }
            },
            minify: true,
            // For unknown URLs, fallback to the index page
            navigateFallback: publicUrl + "/index.html",
            // Ignores URLs starting from /__ (useful for Firebase):
            // https://github.com/facebookincubator/create-react-app/issues/2237#issuecomment-302693219
            navigateFallbackWhitelist: [/^(?!\/__).*/],
            // Don't precache sourcemaps (they're large) and build asset manifest:
            staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/],
        }),
        // Moment.js is an extremely popular library that bundles large locale files
        // by default due to how Webpack interprets its code. This is a practical
        // solution that requires the user to opt into importing specific locales.
        // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
        // You can remove this if you don't use Moment.js:
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        // Perform type checking and linting in a separate process to speed up compilation
        new ForkTsCheckerWebpackPlugin({
            async: false,
            tsconfig: Application.tsConfigProd,
            tslint: Application.tsLint,
        }),
    ],
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
        dgram: "empty",
        fs: "empty",
        net: "empty",
        tls: "empty",
        child_process: "empty",
    },
    resolve: {
        alias: {

            // Support React Native Web
            // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
            "react-native": "react-native-web",
        },
        // These are the reasonable defaults supported by the Node ecosystem.
        // We also include JSX as a common component filename extension to support
        // some tools, although we do not recommend using it, see:
        // https://github.com/facebookincubator/create-react-app/issues/290
        // `web` extension prefixes have been added for better support
        // for React Native Web.
        extensions: [
            ".mjs",
            ".web.ts",
            ".ts",
            ".web.tsx",
            ".tsx",
            ".web.js",
            ".js",
            ".json",
            ".web.jsx",
            ".jsx",
        ],
        // This allows you to set a fallback for where Webpack should look for modules.
        // We placed these paths second because we want `node_modules` to "win"
        // if there are any conflicts. This matches Node resolution mechanism.
        // https://github.com/facebookincubator/create-react-app/issues/253
        modules: ["node_modules", Application.nodeModulesPath].concat(
            // It is guaranteed to exist because we tweak it in `env.js`
            Env.current.split(path.delimiter).filter(Boolean),
        ),
        plugins: [
            // Prevents users from importing files from outside of src/ (or node_modules/).
            // This often causes confusion because we only process files within src/ with babel.
            // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
            // please link the files into your node_modules/ and let module-resolution kick in.
            // Make sure your source files are compiled, as they will not be processed in any way.
            new ModuleScopePlugin(Application.srcPath, [Application.packagePath]),
            new TsconfigPathsPlugin({ configFile: Application.tsConfigProd }),
        ],
    },
};

export default clientConfig;
