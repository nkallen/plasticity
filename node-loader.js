/*
    Webpack is a bit of a nightmare when dealing with binary node modules.
    This replaces the existing functionality with something that seems to work
    better.
*/

const { getOptions, interpolateName } = require('loader-utils');
const path = require('path');

module.exports = function loader(content) {
  const options = getOptions(this);


  const name = interpolateName(
    this,
    typeof options.name !== 'undefined' ? options.name : '[name].[ext]',
    {
      context: this.rootContext,
      content,
    }
  );

  const compiler = this._compiler;
  const outputPath = compiler.options.output.path;
  const fullPath = path.join(outputPath, name);
  return `module.exports = __non_webpack_require__('${fullPath}');` 
}

// export const raw = true;