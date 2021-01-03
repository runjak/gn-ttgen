# Gnöttgen

![Gnöttgen](drawing.svg)

## Play strategy

Gnöttgen tackles the `A38` paper problem in the following fashion:

1. Discover the world
2. Cycle trough all buildings until the level is solved
3. Question all employees going upstairs
4. Move out of the building and onto the next

## Recording

To record level solving Gnöttgen copies code from [runjak/llywodraeth-adar](https://github.com/runjak/llywodraeth-adar),
which in turn was heavily 'inspired' by [jibon57/bbb-recorder](https://github.com/jibon57/bbb-recorder).

## Requirements

Some of the dependencies used by Gnöttgen are:

* ffmpeg
* chrome
* node
* yarn

## Environment

Gnöttgen uses the following environment variables:

* `RTMP_URL`
  * Url to RTMP endpoint. Example: `RTMP_URL="rtmp://…"`
  * Path to a file for testing purposes. Example: `RTMP_URL="/tmp/test.flv"`
* `START_URL`
  * Url that the software should visit initially.
* `FFMPEG_SERVER`
  * Something like `ws://localhost` pointing to where your ffmpeg server lives.
* `FFMPEG_SERVER_PORT`
  * Port used for the local connection from chrome to ffmpeg served via a websocket.
* `WS_AUTH_TOKEN`
  * A token used to verify that the client should be able to stream using the websocket.
  * Set it to something like `pwgen 32 1`.

## Known bugs

* When an employee has two tasks Gnöttgen only ever chooses one of them.
  This can cause Gnöttgen to run in an endless loop forever.

