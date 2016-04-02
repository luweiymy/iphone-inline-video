'use strict';
import getIntervalometer from './lib/intervalometer';
import preventEvent from './lib/prevent-event';
import proxyProperty from './lib/proxy-property';
import Symbol from './lib/poor-mans-symbol';

const isNeeded = /iPhone|iPod/i.test(navigator.userAgent);

const ಠ = Symbol('iiv');
const ಠevent = Symbol('iive');
const ಠplay = Symbol('native-play');
const ಠpause = Symbol('native-pause');

/**
 * UTILS
 */

function getAudioFromVideo(video) {
	const audio = new Audio();
	audio.src = video.currentSrc || video.src;
	return audio;
}

function update(timeDiff) {
	// console.log('update')
	const player = this;
	if (player.audio) {
		const audioTime = player.audio.currentTime;
		player.video.currentTime = audioTime;
		// console.assert(player.video.currentTime === audioTime, 'Video not updating!')
	} else {
		const nextTime = player.video.currentTime + timeDiff / 1000;
		player.video.currentTime = Math.min(player.video.duration, nextTime);
	}
	if (player.video.ended) {
		player.video.pause();
		return false;
	}
}

function startVideoBuffering(video) {
	// this needs to be inside an event handler
	video[ಠevent] = true;
	video[ಠplay]();
	setTimeout(() => {
		video[ಠevent] = true;
		video[ಠpause]();
	}, 0);
}

/**
 * METHODS
 */

function play() {
	// console.log('play')
	const video = this;
	const player = video[ಠ];
	if (!video.buffered.length) {
		// console.log('Video not ready. Buffering')
		startVideoBuffering(video);
	}
	player.paused = false;
	if (player.audio) {
		player.audio.play();
	} else if (video.currentTime === video.duration) {
		video.currentTime = 0;
	}
	player.updater.start();

	video.dispatchEvent(new Event('play'));
	video.dispatchEvent(new Event('playing'));
}
function pause() {
	// console.log('pause')
	const video = this;
	const player = video[ಠ];
	player.paused = true;
	player.updater.stop();
	if (player.audio) {
		player.audio.pause();
	}
	video.dispatchEvent(new Event('pause'));
	if (video.ended) {
		video[ಠevent] = true;
		video.dispatchEvent(new Event('ended'));
	}
}

/**
 * SETUP
 */

function addPlayer(video, hasAudio) {
	const player = video[ಠ] = {};
	player.paused = true;
	player.loop = video.loop;
	player.muted = video.muted;
	player.video = video;
	if (hasAudio) {
		player.audio = getAudioFromVideo(video);
	}
	player.updater = getIntervalometer(update.bind(player));

	// stop programmatic player when OS takes over
	// TODO: should be on play?
	video.addEventListener('webkitbeginfullscreen', () => {
		video.pause();
	});
	if (player.audio) {
		// sync audio to new video position
		// TODO: should be on pause?
		video.addEventListener('webkitendfullscreen', () => {
			player.audio.currentTime = player.video.currentTime;
			// console.assert(player.audio.currentTime === player.video.currentTime, 'Audio not synced');
		});
	}
}

function overloadAPI(video) {
	const player = video[ಠ];
	video[ಠplay] = video.play;
	video[ಠpause] = video.pause;
	video.play = play;
	video.pause = pause;
	proxyProperty(video, 'paused', player);
	proxyProperty(video, 'muted', player);
	preventEvent(video, 'seeking');
	preventEvent(video, 'seeked');
	preventEvent(video, 'play', ಠevent, true);
	preventEvent(video, 'playing', ಠevent, true);
	preventEvent(video, 'pause', ಠevent, true);
	preventEvent(video, 'ended', ಠevent, false); // prevent occasional native ended events
}

/* makeVideoPlayableInline() */
export default function (video, hasAudio = true, onlyWhenNeeded = true) {
	if (onlyWhenNeeded && !isNeeded) {
		return;
	}
	addPlayer(video, hasAudio);
	overloadAPI(video);
}
