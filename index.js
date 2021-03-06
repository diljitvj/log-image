const fs = require("fs");
const png = require("pngjs").PNG;
const jpeg = require("jpeg-js");
const mime = require("mime");
const colors = require("ansi-256-colors");
const MIME_PNG = "image/png";
const MIME_JPEG = "image/jpeg";

function getImageBufferData(path) {
  const mimeType = mime.getType(path);
  switch (mimeType) {
    case MIME_PNG: {
      const imageFile = fs.readFileSync(path);
      const { width, height, data } = png.sync.read(imageFile);
      return {
        width,
        height,
        data
      };
    }
    case MIME_JPEG: {
      const imageFile = fs.readFileSync(path);
      const { width, height, data } = jpeg.decode(imageFile);
      return {
        width,
        height,
        data
      };
    }
    default:
      throw new Error("MIME type not supported: " + mime);
  }
}

function resizeImageWithNewWidth(
  imageData,
  actualWidth,
  actualHeight,
  targetWidth
) {
  const resizeFactor = Math.floor(actualWidth / targetWidth);
  if (resizeFactor > 1) {
    let y = 0;
    let resizedImageData = [];
    const targetHeight = Math.floor(actualHeight / resizeFactor);
    while (y < targetHeight) {
      // Iterate through each row of the canvas. Incremented in units of tile height
      let x = 0;
      while (x < targetWidth) {
        //Iterate through each column of a particular row. Incremented in units of tile width
        let i = 0;
        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 0;
        while (i < resizeFactor) {
          let row = imageData.slice(
            i * actualWidth * 4 +
              x * resizeFactor * 4 +
              y * resizeFactor * actualWidth * 4,
            i * actualWidth * 4 +
              x * resizeFactor * 4 +
              y * resizeFactor * actualWidth * 4 +
              resizeFactor * 4
          );

          //Get average color of the 1px row of the tile
          row.forEach((color, index) => {
            switch (index % 4) {
              case 0:
                red += color;
                break;
              case 1:
                green += color;
                break;
              case 2:
                blue += color;
                break;
              case 3:
                alpha += color;
                break;
            }
          });
          i++; // Increment the row inside tile by 1px
        }
        //Computation of average color of single tile
        if (
          typeof red === "number" &&
          typeof blue === "number" &&
          typeof green === "number"
        ) {
          alpha = Math.floor(alpha / (resizeFactor * resizeFactor));
          red = Math.floor((red * alpha) / (resizeFactor * resizeFactor * 255));
          green = Math.floor(
            (green * alpha) / (resizeFactor * resizeFactor * 255)
          );
          blue = Math.floor(
            (blue * alpha) / (resizeFactor * resizeFactor * 255)
          );

          resizedImageData.push(red);
          resizedImageData.push(green);
          resizedImageData.push(blue);
          resizedImageData.push(alpha);
        }
        x++;
      }
      y++;
    }
    return {
      data: resizedImageData,
      width: targetWidth,
      height: targetHeight
    };
  }

  return { data: imageData, width: actualHeight, height: actualHeight };
}

/**
 *
 * @param {String} path Path to the image file
 * @param {Number} renderWidthPercentage Percentage width of terminal to render
 * defaults to 100 %
 */

function renderImage(path, renderWidthPercentage = 100) {
  if ("string" !== typeof path) throw new Error("path must be a string");

  if (
    typeof renderWidthPercentage === "number" &&
    (renderWidthPercentage <= 0 || renderWidthPercentage > 100)
  )
    throw new Error(
      "Render width percentage mush be a number between 1 and 100"
    );

  const { data, width, height } = getImageBufferData(path);
  const terminalWidth = Math.floor(
    (process.stdout.columns * renderWidthPercentage) / 200
  );
  const {
    data: resizedImage,
    width: newWidth,
    height: newHeight
  } = resizeImageWithNewWidth(data, width, height, terminalWidth);

  const imageLogArr = [];

  for (let i = 0; i < newHeight; i++) {
    let rowColors = [];
    let row = resizedImage.slice(
      i * newWidth * 4,
      i * newWidth * 4 + newWidth * 4
    );
    for (let j = 0; j < newWidth * 4; j = j + 4) {
      rowColors.push([row[j], row[j + 1], row[j + 2]]);
    }
    imageLogArr.push(
      eval(
        rowColors
          .map(p => {
            return `colors.fg.getRgb(${Math.ceil((p[0] * 5) / 255)},${Math.ceil(
              (p[1] * 5) / 255
            )},${Math.ceil((p[2] * 5) / 255)})+ "██" + colors.reset`;
          })
          .join(" + ")
      )
    );
  }

  return imageLogArr.join("\n");
}

module.exports = renderImage;
