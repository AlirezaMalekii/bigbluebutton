const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const fs = require('fs');
const express = require('express');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

const env = process.env.NODE_ENV || 'development';
const detailedLogs = process.env.DETAILED_LOGS || false;
const hotReload = String(process.env.HOT_RELOAD).toLowerCase() === 'true';
const bbbServer = process.env.BBB_SERVER || '';
const prodEnv = 'production';
const devEnv = 'development';
const isDev = env === devEnv;
const isSafariTarget = process.env.TARGET === 'safari';

const buildRemoteDevProxy = (remoteServerUrl, localOrigin) => {
  const remoteUrl = new URL(remoteServerUrl);
  const remoteOrigin = remoteUrl.origin;
  const remoteHost = remoteUrl.host;
  const localUrl = new URL(localOrigin);
  const localOriginHttp = localUrl.origin;
  const localOriginWs = localOriginHttp.replace(/^http/, 'ws');

  const rewriteApiIndexResponse = (proxyRes, req, res) => {
    const bodyChunks = [];

    proxyRes.on('data', (chunk) => {
      bodyChunks.push(chunk);
    });

    proxyRes.on('end', () => {
      let body = Buffer.concat(bodyChunks).toString('utf8');
      // Route HTTP + GraphQL WS through localhost. WS proxy rewrites Origin to the
      // remote host so bbb-graphql-middleware accepts the connection (it rejects
      // cross-origin from localhost by default).
      body = body
        .replace(`https://${remoteHost}/api/rest`, `${localOriginHttp}/api/rest`)
        .replace(`wss://${remoteHost}/graphql`, `${localOriginWs}/graphql`);

      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      res.end(body);
    });
  };

  const quietProxyErrors = {
    error: (err) => {
      if (err?.code === 'ECONNRESET' || err?.code === 'ECONNABORTED') {
        return;
      }
      process.stderr.write(`[BBB remote proxy] ${err.code || err.message}\n`);
    },
  };

  const sharedProxyOptions = {
    target: remoteOrigin,
    changeOrigin: true,
    secure: false,
    ws: false,
    on: quietProxyErrors,
  };

  return [
    {
      ...sharedProxyOptions,
      context: (pathname) => pathname === '/bigbluebutton/api',
      selfHandleResponse: true,
      onProxyRes: rewriteApiIndexResponse,
    },
    {
      target: remoteOrigin,
      changeOrigin: true,
      secure: false,
      ws: true,
      context: '/graphql',
      on: quietProxyErrors,
      onProxyReqWs: (proxyReq) => {
        proxyReq.setHeader('origin', remoteOrigin);
      },
    },
    {
      ...sharedProxyOptions,
      context: [
        '/bigbluebutton',
        '/api',
        '/bbb-webrtc-sfu',
        '/livekit',
        '/hocuspocus',
        '/pad',
        '/learning-analytics-dashboard',
      ],
    },
  ];
};

const setupRemoteDevStaticAssets = (devServer, publicPath) => {
  const publicDir = path.join(__dirname, 'public');
  const privateDir = path.join(__dirname, 'private');
  const localesDir = path.join(publicDir, 'locales');

  const sendLocalesIndex = (_req, res) => {
    fs.readdir(localesDir, (err, files) => {
      if (err) {
        res.sendStatus(500);
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(files.map((name) => ({ name, type: 'file' })));
    });
  };

  // Mirrors nginx `bbb-html5.nginx.dev` locales autoindex for Mac remote dev only.
  devServer.app.get(`${publicPath}locales`, sendLocalesIndex);
  devServer.app.get(`${publicPath}locales/`, sendLocalesIndex);
  devServer.app.use(publicPath, express.static(publicDir, { index: false }));
  devServer.app.use(`${publicPath}private`, express.static(privateDir, { index: false }));
};

process.stdout.write(`Building: ${process.env.TARGET}\n`);

const remoteDevPublicPath = '/html5client/';

const config = {
  entry: './client/main.tsx',
  output: {
    filename: isSafariTarget
      ? 'bundle.safari.js'
      : 'bundle.[fullhash].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: isDev && bbbServer ? remoteDevPublicPath : '',
  },
  cache: {
    type: 'filesystem',
    allowCollectingMemory: true,
    maxAge: 86400000,
  },
  devtool: 'source-map',
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new HtmlWebpackPlugin({
      template: './client/main.html',
      filename: 'index.html',
      inject: false,
      templateParameters: (compilation, assets, assetTags, options) => {
        const fullhash = compilation.hash;
        return {
          compilation,
          webpackConfig: compilation.options,
          htmlWebpackPlugin: {
            tags: assetTags,
            files: assets,
            options,
          },
          bundleHash: fullhash,
          isProduction: env === prodEnv,
        };
      },
    }),
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'private', to: 'private' },
      ],
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env),
      'process.env.DETAILED_LOGS': detailedLogs,
    }),
    (isDev && hotReload) && new ReactRefreshWebpackPlugin({
      overlay: false,
      exclude: /worker\.ts$/,
    }),
  ],
  resolve: {
    modules: ['node_modules', 'src'],
    enforceExtension: false,
    fullySpecified: false,
    extensions: ['.mjs', '.js', '.jsx', '.tsx', '.ts', '...'],
    alias: {
      '/client': path.resolve(__dirname, 'client/'),
      '/imports': path.resolve(__dirname, '/imports/'),
      '@tiptap/core/jsx-runtime': path.resolve(__dirname, 'node_modules/@tiptap/core/dist/jsx-runtime/jsx-runtime.js'),
      yjs: path.resolve(__dirname, 'node_modules/yjs'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        resolve: {
          fullySpecified: false,
          enforceExtension: false,
        },
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [(isDev && hotReload) && require.resolve('react-refresh/babel')].filter(Boolean),
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  [
                    'autoprefixer',
                    {
                      overrideBrowserslist: ['last 2 versions', '>1%'],
                    },
                  ],
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        exclude: /node_modules/,
        use: ['file-loader'],
      },
    ],
  },
};

if (env === prodEnv) {
  config.plugins.push(new CompressionPlugin());
  config.mode = prodEnv;
  config.optimization = {
    minimize: true,
    minimizer: isSafariTarget ? [] : [new TerserPlugin()],
  };
  config.performance = {
    hints: 'warning',
    maxAssetSize: isSafariTarget ? 16000000 : 8000000,
    maxEntrypointSize: isSafariTarget ? 16000000 : 8000000,
  };
} else {
  config.mode = devEnv;
  const devServerPort = Number(process.env.PORT) || 3000;
  const localDevOrigin = `http://localhost:${devServerPort}`;

  config.devServer = {
    port: devServerPort,
    hot: true,
    allowedHosts: 'all',
    devMiddleware: bbbServer ? {
      publicPath: remoteDevPublicPath,
    } : undefined,
    historyApiFallback: bbbServer ? {
      rewrites: [
        { from: /^\/html5client\/?$/, to: `${remoteDevPublicPath}index.html` },
      ],
    } : {
      rewrites: [
        { from: /^\/html5client/, to: '/index.html' },
      ],
    },
    client: {
      overlay: false,
      webSocketURL: 'auto://0.0.0.0:0/html5client/ws',
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      devServer.app.use((req, res, next) => {
        if (bbbServer && req.method === 'GET' && req.path === '/') {
          res.redirect(302, remoteDevPublicPath);
          return;
        }

        // the server crashes when it receives HEAD requests, so we need to prevent it
        if (req.method === 'HEAD') {
          // console.log(`Request received: ${req.method} ${req.url}`);
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Content-Length', '0');
          res.end();
        } else {
          next();
        }
      });

      if (bbbServer) {
        setupRemoteDevStaticAssets(devServer, remoteDevPublicPath);
      }

      return middlewares;
    },
  };

  if (bbbServer) {
    process.stdout.write(`Remote BBB backend: ${bbbServer}\n`);
    process.stdout.write(`Local dev UI: ${localDevOrigin}/html5client/\n`);
    process.stdout.write('GraphQL WS: localhost proxy (Origin rewritten for remote server)\n');
    config.devServer.proxy = buildRemoteDevProxy(bbbServer, localDevOrigin);
  }
}

module.exports = config;
