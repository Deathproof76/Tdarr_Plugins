// Just edited a bit of the original from Mthrboard
// Also use Filter - break out of plugin stack if processed because of hevc to hevc which would create a loop
// a more elegant solution would be a rename after processing, still working on that
/* eslint-disable */
const vaapiPrefix = ` -hwaccel vaapi -hwaccel_device /dev/dri/renderD129 -hwaccel_output_format vaapi `;

const details = () => {
  return {
    id: `Tdarr_Plugin_DtPf_VaapiHEVCFrameRepair`,
    Stage: 'Pre-processing',
    Name: `FRAME REPAIR FFMPEG VAAPI HEVC`,
    Type: `Video`,
    Operation: `Transcode`,
    Description: `Damaged MKV Files in HEVC will be reencoded to HEVC video using ffmpeg with libvaapi. ` +
      `Intel QuickSync-enabled CPU required, recommended 8th generation or newer.\n ` +
      `Output bitrate will be calculated based on input file size trying to replicate the original bitrate.\n\n`,
    Version: `0.1`,
    Tags: `pre-processing,ffmpeg,video only,h265,configurable`,
    Inputs: [{
      name: `_i_frame_issue_Only`,
      type: 'string',
      defaultValue:'true',
      inputUI: {
        type: 'text',
      },
      tooltip: `Specify whether this plugin should only run on files with i_frame_issue in their names. ` +
        `Valid options are true or false.` +
        `\\nExample: ` +
        `\\ntrue ` +
        `\\nExample: ` +
        `\\nfalse`
    },{
      name: `minBitrate`,
      type: 'string',
      defaultValue:'',
      inputUI: {
        type: 'text',
      },
      tooltip: `Specify the minimum bitrate at which this plugin will run. Files with a current bitrate ` +
        `lower than this cutoff will not be transcoded. Leave blank to disable. ` +
        `\\nExample: ` +
        `\\n4000`
    }]
  }
}

// eslint-disable-next-line no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
    
    const lib = require('../methods/lib')();
  // eslint-disable-next-line no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);
  var response = {
    processFile: false,
    preset: ``,
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: false,
    infoLog: ``
  };

  var videoProcessingRequired = false;
  var ffmpegParameters = ``;
  var duration = 0;
  var currentBitrate = 0;
  var targetBitrate = 0;
  var minimumBitrate = 0;
  var maximumBitrate = 0;

  if (inputs._i_frame_issue_Only.toLowerCase() == `true` && !file.file.toLowerCase().includes(`i_frame_issue`)) {
    response.infoLog += `☒ IFrameIssueOnly is enabled and file isn't marked. Unable to process.\n`;
    return response;
  }

  if (file.fileMedium !== `video`) {
    response.infoLog += `☒ File is not a video. Unable to process.\n`;
    return response;
  }

  file.ffProbeData.streams.forEach(function(stream) {
  if (stream.codec_type == `video`) {

    if (stream.codec_name !== `mjpeg` && stream.codec_name !== `h264`) {
      videoProcessingRequired = true;

      // Formula borrowed from Migz h265 transcode plugins
      // Get duration in minutes, then work out currentBitrate using
      // Bitrate = file size / (stream duration * .0075)
      // Calculations were made based on the formula from this site:
      // https://blog.frame.io/2017/03/06/calculate-video-bitrates/
      duration = (file.meta.Duration !== `undefined` ? file.meta.Duration : stream.duration) * 0.0166667;
      currentBitrate = ~~(file.file_size / (duration * 0.0075));
      targetBitrate = ~~(currentBitrate);
      minimumBitrate = ~~(targetBitrate * 0.7);
      maximumBitrate = ~~(targetBitrate * 1.3);

      if (targetBitrate == 0) {
        response.infoLog += `☒ Target bitrate could not be calculated. Skipping this plugin.\n`;
        return response;
      }

      if (inputs.minBitrate !== `` && currentBitrate <= inputs.minBitrate) {
        response.infoLog += `☒ Input file's bitrate ${currentBitrate} is lower than the minimum ` +
          `bitrate threshold of ${inputs.minBitrate}. Skipping this plugin.\n`;
        return response;
      }

      response.infoLog += `☒ Video stream ${stream.index} is not intact hevc, transcode required.\n `;
      ffmpegParameters += ` -c:v:0 hevc_vaapi -b:v ${targetBitrate}k -minrate ${minimumBitrate}k ` +
        `-maxrate ${maximumBitrate}k -bufsize 1M -max_muxing_queue_size 1024 `;
      }
    }
  });

  if (videoProcessingRequired) {
    response.infoLog += `☑ Stream analysis complete, processing required.\n `;
    response.preset = `${vaapiPrefix},-map 0:v -map 0:a -map 0:s? -map 0:d? -map 0:t? -c copy ${ffmpegParameters} `;
    response.container = `${file.container}`;
    response.processFile = true;
  } else {
    response.infoLog += `☑ Stream analysis complete, no processing required.\n`;
  }
  return response;
}



module.exports.details = details;
module.exports.plugin = plugin;
