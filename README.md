# Youtube Retitler

Inspired by [Tom Scott's video](https://www.youtube.com/watch?v=BxV14h0kFs0), this Youtube title 
and thumbnail updater was created for my kid's 
[Youtube video](https://www.youtube.com/watch?v=fdgq0pIi8Hc). As shown below in this
live screenshot demonstration that displays the latest view and like counts:

<p align="center"> 
<img src="https://mellican.com/images/youtube.png?github=youtube-retitler" width=70%><br>
Smash that like button :laughing:
</p>

# Pre-requisites

* Node.js. Find the latest version here: https://nodejs.org/en/download/
* Youtube API OAuth credentials. Follow steps 1 and 2 of the
[Node.js Quickstart guide](https://developers.google.com/youtube/v3/quickstart/nodejs).

# How to install

1. Download the Youtube Retitler Git repository and change to the directory:

   ```
   git clone https://github.com/meltaxa/youtube-retitler.git
   cd youtube-retitler
   ```

1. Copy your Youtube API credentials json file into the directory.

1. Copy the example config file and update it accordingly.

   ```
   cp config.js-example config.js
   ```

1. Install required Node packages:

   ```
   npm install
   ```

1. Run the retitler main script:

   ```
   node main.js
   ```

1. As per [step 4 of the Youtube API guide](https://developers.google.com/youtube/v3/quickstart/nodejs), 
on the initial run, you will be prompted to authorize access for the program. Follow the instructions.

# Automation

Use a scheduler such as cron to check and make title updates automatically. For example,

```
# Update a Youtube video title every minute.
* * * * * cd /path/to/youtube-retitler; node main.js
```

The YouTube Data API has a default quota allocation of 10,000 units per day. API methods have
different costs, for example the API video.list method is 1 API unit cost. Updating the title 
costs 50 API units. In the example cron schedule, it will cost at least 1440 API units to check
the video view and like counts, which leaves 8560 units for updates. An update costs 100 units 
(50 each for video.update and thumbnails.set API method). After 85 title updates, the quota 
will be exceeded for the day. 
