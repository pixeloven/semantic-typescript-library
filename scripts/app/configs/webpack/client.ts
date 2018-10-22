import autoprefixer from "autoprefixer";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import ExtractTextPlugin from "extract-text-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import InterpolateHtmlPlugin from "react-dev-utils/InterpolateHtmlPlugin";
import ModuleScopePlugin from "react-dev-utils/ModuleScopePlugin";
import SWPrecacheWebpackPlugin from "sw-precache-webpack-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import UglifyJsPlugin from "uglifyjs-webpack-plugin";
import {DevtoolModuleFilenameTemplateInfo, Node, Output, Resolve} from "webpack";
import webpack from "webpack";
import {getIfUtils, removeEmpty} from "webpack-config-utils";
import ManifestPlugin from "webpack-manifest-plugin";
import Application from "../../Application";
import {WatchMissingNodeModulesPlugin} from "../../libraries/ReactDevUtils";
import Env from "../env";
import files from "../files";
import {catchAllRule, staticFileRule, typeScriptRule} from "./common/rules";

// TODO upgrade to webpack 4 and add
// import MiniCssExtractPlugin from "mini-css-extract-plugin";

// TODO replace not prod with develop?
const {ifProduction, ifNotProduction} = getIfUtils(Env.current);

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
 * Post CSS fixes
 */
const postCssPlugin = () => [
    require("postcss-flexbugs-fixes"),
    autoprefixer({
        browsers: [
            ">1%",
            "last 4 versions",
            "Firefox ESR",
            "not ie < 9", // React doesn"t support IE8 anyway
        ],
        flexbox: "no-2009",
    }),
];

/**
 * Describe source pathing in dev tools
 * @param info
 */
const devtoolModuleFilenameTemplate = (info: DevtoolModuleFilenameTemplateInfo) => {
    if (ifProduction()) {
        return path
            .relative(Application.srcPath, info.absoluteResourcePath)
            .replace(/\\/g, "/");
    }
    return path.resolve(info.absoluteResourcePath).replace(/\\/g, "/");
};

/**
 * @description Some libraries import Node modules but don"t use them in the browser.
 * Tell Webpack to provide empty mocks for them so importing them works.
 */
const node: Node = {
    child_process: "empty",
    dgram: "empty",
    fs: "empty",
    net: "empty",
    tls: "empty",
};

/**
 * @description Define output file and paths.
 */
const output: Output = {
    chunkFilename: files.outputPattern.jsChunk, // TODO need to add support for hash pattern
    devtoolModuleFilenameTemplate, // TODO do we need this if we don't do sourcemaps in prod??
    filename: files.outputPattern.js,
    path: ifProduction(`${Application.buildPath}/public`, "/"),
    pathinfo: ifNotProduction(),
    publicPath: ifProduction(Application.servedPath, "/"),
};

/**
 * @description Plugins need to webpack to perform build
 */
const plugins = removeEmpty([
    /**
     * Makes some environment variables available in index.html.
     * The public URL is available as %PUBLIC_URL% in index.html, e.g.:
     * <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
     * In development, this will be an empty string.
     * TODO for this and the below comment shouldn't we just use the server side entry point??? or is this good for development only???
     *
     * @env all
     */
    new InterpolateHtmlPlugin(Env.config()),
    /**
     * Generates an `index.html` file with the <script> injected.
     *
     * @env all
     */
    new HtmlWebpackPlugin(removeEmpty({
        inject: true,
        minify: ifProduction({
            collapseWhitespace: true,
            keepClosingSlash: true,
            minifyCSS: true,
            minifyJS: true,
            minifyURLs: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeRedundantAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
        }),
        template: Application.publicEntryPoint,
    })),
    /**
     * Add module names to factory functions so they appear in browser profiler.
     *
     * @env development
     */
    ifNotProduction(new webpack.NamedModulesPlugin()),
    /**
     * Makes some environment variables available to the JS code, for example:
     * if (process.env.NODE_ENV === "development") { ... }. See `./env.js`.
     *
     * @env all
     */
    new webpack.DefinePlugin(Application.definePluginSettings),
    /**
     * Minify the code.
     * Note: this won't work without ExtractTextPlugin.extract(..) in `loaders`.
     *
     * @env production
     */
    ifProduction(new UglifyJsPlugin({
        // Enable file caching
        cache: true,
        // Use multi-process parallel running to improve the build speed
        // Default number of concurrent runs: os.cpus().length - 1
        parallel: true,
        sourceMap: Env.config("GENERATE_SOURCE_MAP") !== "false",
        uglifyOptions: {
            compress: {
                // Disabled because of an issue with Uglify breaking seemingly valid code:
                // https://github.com/facebook/create-react-app/issues/2376
                // Pending further investigation:
                // https://github.com/mishoo/UglifyJS2/issues/2011
                comparisons: false,
                ecma: 5,
                warnings: false,
            },
            mangle: {
                safari10: true,
            },
            output: {
                // Turned on because emoji and regex is not minified properly using default
                // https://github.com/facebook/create-react-app/issues/2488
                ascii_only: true,
                comments: false,
                ecma: 5,
            },
            parse: {
                // we want uglify-js to parse ecma 8 code. However we want it to output
                // ecma 5 compliant code, to avoid issues with older browsers, this is
                // whey we put `ecma: 5` to the compress and output section
                // https://github.com/facebook/create-react-app/pull/4234
                ecma: 8,
            },
        },
    })),
    /**
     * Extract css to file
     * @env production
     */
    ifProduction(new ExtractTextPlugin({
        filename: files.outputPattern.css,
    })),
    /**
     * Generate a manifest file which contains a mapping of all asset filenames
     * to their corresponding output file so that tools can pick it up without
     * having to parse `index.html`.
     *
     * @env production
     */
    ifProduction(new ManifestPlugin({
        fileName: "asset-manifest.json",
    })), // TODO again should we be doing this in prod????
    /**
     * Generate a service worker script that will precache, and keep up to date,
     * the HTML & assets that are part of the Webpack build.
     *
     * @env production
     */
    ifProduction(new SWPrecacheWebpackPlugin({
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
    })),
    /**
     * This is necessary to emit hot updates (currently CSS only):
     *
     * @env development
     */
    ifNotProduction(new webpack.HotModuleReplacementPlugin()),
    /**
     * Watcher doesn"t work well if you mistype casing in a path so we use
     * a plugin that prints an error when you attempt to do this.
     * See https://github.com/facebookincubator/create-react-app/issues/240
     *
     * @env development
     */
    ifNotProduction(new CaseSensitivePathsPlugin()),

    /**
     * If you require a missing module and then `npm install` it, you still have
     * to restart the development server for Webpack to discover it. This plugin
     * makes the discovery automatic so you don"t have to restart.
     * See https://github.com/facebookincubator/create-react-app/issues/186
     *
     * @env development
     */
    ifNotProduction(new WatchMissingNodeModulesPlugin(Application.nodeModulesPath)),
    /**
     * Moment.js is an extremely popular library that bundles large locale files
     * by default due to how Webpack interprets its code. This is a practical
     * solution that requires the user to opt into importing specific locales.
     * @url https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
     * @env all
     */
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    /**
     * Perform type checking and linting in a separate process to speed up compilation
     *
     * @env all
     */
    ifProduction(new ForkTsCheckerWebpackPlugin({
        async: false,
        tsconfig: Application.tsConfig,
        tslint: Application.tsLint,
    }), new ForkTsCheckerWebpackPlugin({
        async: false,
        tsconfig: Application.tsConfig,
        tslint: Application.tsLint,
        watch: Application.srcPath,
    })),
]);

/**
 * @description Tell webpack how to resolve files and modules
 * Prevents users from importing files from outside of src/ (or node_modules/).
 * This often causes confusion because we only process files within src/ with babel.
 * To fix this, we prevent you from importing files out of src/ -- if you'd like to,
 * please link the files into your node_modules/ and let module-resolution kick in.
 * Make sure your source files are compiled, as they will not be processed in any way.
 */
const resolve: Resolve = {
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
    modules: ["node_modules", Application.nodeModulesPath],
    plugins: [
        new ModuleScopePlugin(Application.srcPath, [Application.packagePath]),
        new TsconfigPathsPlugin({ configFile: Application.tsConfig }),
    ],
};

// TODO unify server and client configs for entry
export default {
    bail: ifProduction(),
    devtool: ifProduction("source-map", "cheap-module-source-map"), // TODO if prod should we even do this???
    entry: removeEmpty([
        ifNotProduction(require.resolve("react-dev-utils/webpackHotDevClient")),
        Application.clientEntryPoint,
    ]),
    module: {
        rules: [
            {
                oneOf: [
                    staticFileRule,
                    typeScriptRule,
                    {
                        test: /\.(scss|sass|css)$/i,
                        use: removeEmpty([
                            // ifProduction(MiniCssExtractPlugin.loader), // TODO with upgrade to webpack 4
                            ifNotProduction({loader: "style-loader", options: {sourceMap: true}}),
                            {loader: "css-loader", options: {sourceMap: true}},
                            {
                                loader: "postcss-loader",
                                options: {
                                    ident: "postcss",
                                    plugins: postCssPlugin,
                                    sourceMap: true,
                                },
                            },
                            {loader: "sass-loader", options: {sourceMap: true}},
                        ]),
                    },
                    catchAllRule,
                ],
            },
        ],
    },
    node,
    output,
    performance: { // TODO only for dev????
        hints: false,
    },
    plugins,
    resolve,
    target: "web",
};
