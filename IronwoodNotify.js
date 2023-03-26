// ==UserScript==
// @name         Ironwood notify
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Plays sound notifications if you're idling
// @author       Des
// @match        *://*.ironwoodrpg.com/*
// @icon         https://github.com/Desperer/IronwoodScripts/blob/main/icon/IronwoodSword.png?raw=true
// @grant        none
// @license      MIT
// ==/UserScript==

//Change notification sound, volume, and time between alerts while idling
let beat = new Audio("https://cdn.freesound.org/previews/504/504773_9961300-lq.mp3")
beat.volume = 0.8 //default 0.6
let timeInterval = 10*1000 // Default timeInterval 10*1000 = 10 seconds

//
//DO NOT EDIT BELOW
//

let resetPlay = true

function soundplay(){
    if( document.getElementsByClassName("ring").length == 0){
        if( resetPlay ){
            beat.play();
            resetPlay = true
        }
    } else {
        beat.load()
        resetPlay = true
    }
}

let soundInterval = setInterval(soundplay, timeInterval)