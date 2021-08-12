const Jimp = require('jimp') ;

// Google YouTube code block below is from 
// https://developers.google.com/youtube/v3/quickstart/nodejs
// Some variables have been replaced with the config variable.

const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

var config = require('./config');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"];
var TOKEN_DIR =
  (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
  "/.credentials/";
var TOKEN_PATH = TOKEN_DIR + "youtube-updater-" + config.credentials_file;

const youtube = google.youtube("v3");

// Load client secrets from a local file.
fs.readFile(config.credentials_file, function processClientSecrets(err, content) {
  if (err) {
    console.log("[ERROR] Error loading client secret file: " + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the YouTube API.
  authorize(JSON.parse(content), makeAuthCall);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function (err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("[INFO] Authorize this app by visiting this url: ", authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", function (code) {
    rl.close();
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log("[ERROR] Error while trying to retrieve access token", err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != "EEXIST") {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log("[INFO] Token stored to " + TOKEN_PATH);
  });
}

// End of Google Youtube API code block

function checkFileExistsSync(filepath){
  let flag = true;
  try{
    fs.accessSync(filepath, fs.constants.F_OK);
  }catch(e){
    flag = false;
  }
  return flag;
}

function writeCache(filename, contents) {
  fs.writeFile(filename, contents, (err) => {
    if (err) console.log(`[ERROR] ${err}`);
  });
}

const makeAuthCall = (auth) => {
  // Quota cost: 1
  youtube.videos.list(
    {
      auth: auth,
      id: config.video_id,
      part: "id,snippet,statistics",
    },
    (err, response) => {
      if (err) {
        console.log(`[ERROR] ${err}`);
        return;
      }

      if (response.data.items[0]) {
        console.log(`[INFO] Video ${config.video_id} found. Checking analytics...`);
        updateVideoTitle(response.data.items[0], auth);
      }
    }
  );
};

const updateVideoTitle = (video, auth) => {
  // Get view and like counts
  let views = video.statistics.viewCount;
  let likes = video.statistics.likeCount;
  const cacheFile = '.title_cache';
  var UPDATE = false;

  video.snippet.title = video.snippet.title.replace(/%views%/g, views);
  video.snippet.title = video.snippet.title.replace(/%likes%/g, likes);

  if (checkFileExistsSync(cacheFile)) {
    console.log('[INFO] Checking title and cache...');
  } else {
    console.log('[INFO] Creating a title cache file.');
    writeCache(cacheFile, 'Empty');
    UPDATE = false;
  }

  const content = fs.readFileSync(cacheFile, 'utf8');
  if (content != video.snippet.title) { 
    console.log('[INFO] Change detected.') 
    writeCache(cacheFile, video.snippet.title);
    UPDATE = true;
  } else {
    console.log('[INFO] No change detected. Skipping update.') 
    UPDATE = false;
  }

  if (UPDATE) {

    var thumbnail_text = config.thumbnail_text.replace(/%views%/g, views);
    thumbnail_text = thumbnail_text.replace(/%likes%/g, likes);
    console.log('[INFO] Creating new thumbnail image...');
    Jimp.read(config.thumbnail_image, (err, image) => {
      if (err) throw err;
      Jimp.loadFont(config.font_file).then(function(font) {
        image.print(font, config.thumbnail_text_x, config.thumbnail_text_y, {
            text: thumbnail_text,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_CENTER
          }, image.bitmap.width, image.bitmap.height).write('.new_thumbnail.jpg');
      })
    });

    console.log(`[INFO] Updating title to ${video.snippet.title}`);

    // Quota cost: 50
    youtube.videos.update(
      {
        auth: auth,
        part: "snippet,statistics",
        resource: video,
      },
      (err, response) => {
        console.log(response);
        if (err) {
          console.log(`[ERROR] There was an error updating ${err}`);
          return;
        }
        if (response.data.items) {
          console.log("[INFO] Video title updated.");
        }
      }
    );

    // Quota cost: 50
    youtube.thumbnails.set(
      {
        auth: auth,
        videoId: config.video_id,
        media: {
          mimeType: "image/jpeg",
          body: fs.readFileSync(".new_thumbnail.jpg"),
        },
      },
      (err, response) => {
        console.log(response);
        if (err) {
          console.error(`[ERROR] ${err}`);
          return;
        }
        if (response.data.items) {
          console.log("[INFO] Thumbnail uploaded.");
        }
      }
    );
  }
};
