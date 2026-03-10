// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Customize the config to fix CSP issues
  if (config.devServer) {
    config.devServer.headers = {
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:;"
    };
  }
  
  return config;
};