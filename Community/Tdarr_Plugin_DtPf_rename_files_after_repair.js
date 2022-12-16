/* eslint-disable */

// tdarrSkipTest
const details = () => {
  return {
    id: "Tdarr_Plugin_DtPf_rename_files_after_repair",
    Stage: "Post-processing",
    Name: "Rename repaired File",
    Type: "Video",
    Operation: "Transcode",
    Description: `[Contains built-in filter] If the filename contains '_i_frame_issue', this plugin removes this, ideally after being repaired. \n\n`,
    Version: "1.00",
    Tags: "post-processing",
    Inputs:[]
  };
};

// eslint-disable-next-line no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
    
    const lib = require('../methods/lib')();
  // eslint-disable-next-line no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);
  try {
    var fs = require("fs");
    var fileNameOld = file._id;

    if (
      file.file.includes("i_frame_issue")
    ) {
      file.file = file.file.replace("_i_frame_issue", "_healed");
    }
    
    if (fileNameOld != file._id) {
      fs.renameSync(fileNameOld, file._id, {
        overwrite: true,
      });

      var response = {
        file,
        removeFromDB: false,
        updateDB: true,
      };

      return response;
    }
  } catch (err) {
    console.log(err);
  }
};


 
module.exports.details = details;
module.exports.plugin = plugin;
