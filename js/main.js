/**
 * Author: Alex Blackwell
 * Date: July 27, 2020
 *
 * Credit: Wayou
 *    -> Made the skeleton of the code including work on drag and drop
 *       functionality and getting data from the audio file.
 *    -> Check his project out here (https://github.com/Wayou/HTML5_Audio_Visualizer/)
 */

// By using HSV it is easier to get a shade of one colour
// https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}


window.onload = function() {
  new Visualizer().ini();
};


var Visualizer = function() {
  this.file = null, // the current file
  this.fileName = null, // the current file name
  this.audioContext = null,
  this.source = null, // the audio source
  this.info = document.getElementById('info').innerHTML, //this used to upgrade the UI information
  this.infoUpdateId = null, // to store the setTimeout ID and clear the interval
  this.animationId = null,
  this.status = 0, // flag for sound is playing 1 or stopped 0
  this.forceStop = false,
  this.allCapsReachBottom = false,
  this.numSampled = 1,
  this.totalPitchData = 0
};


Visualizer.prototype = {
  ini: function() {
      this._prepareAPI();
      this._addEventListner();
  },

  _prepareAPI: function() {
    // fix browser vender for AudioContext and requestAnimationFrame
    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
    window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
    window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
    try {
      this.audioContext = new AudioContext();
    } catch (e) {
      this._updateInfo('!Your browser does not support AudioContext', false);
      console.log(e);
    }
  },

  _addEventListner: function() {
    var thisClone = this;
    var audioInput = document.getElementById('uploadedFile');
    var dropContainer = document.getElementById("wrapper");
    // listen the file upload
    audioInput.onchange = function() {
        if (audioInput.files.length !== 0) {
            // only process the first file
            thisClone.file = audioInput.files[0];
            thisClone.fileName = thisClone.file.name.replace(/\.[^/.]+$/, "");  // no extension
            if (thisClone.status === 1) {
              // the sound is still playing but we upload another file, so set the forceStop flag to true
              thisClone.forceStop = true;
            }
            thisClone._updateInfo('Uploading', true);
            // once the file is ready, start the visualizer
            thisClone._start();
        }
    }
    // listen the drag & drop
    dropContainer.addEventListener("dragenter", function() {
      thisClone._updateInfo('Drop the song to visualize it', true);
    }, false);
    dropContainer.addEventListener("dragover", function(e) {
      e.stopPropagation();
      e.preventDefault();
      thisClone._updateInfo('Drop the song to visualize it', true);
      // set the drop mode
      e.dataTransfer.dropEffect = 'copy';
    }, false);
    dropContainer.addEventListener("dragleave", function() {
      thisClone._updateInfo(thisClone.info, false);
    }, false);
    dropContainer.addEventListener("drop", function(e) {
      e.stopPropagation();
      e.preventDefault();
      thisClone._updateInfo('Uploading', true);
      // get the dropped file
      thisClone.file = e.dataTransfer.files[0];
      if (thisClone.status === 1)
        thisClone.forceStop = true;

      thisClone.fileName = thisClone.file.name.replace(/\.[^/.]+$/, "");  // no extension
      // once the file is ready,start the visualizer
      thisClone._start();
    }, false);
  },

  _start: function() {
    // read and decode the file into audio array buffer
    var thisClone = this;
    var file = thisClone.file;
    var fr = new FileReader();

    fr.onload = function(e) {
      var fileResult = e.target.result;
      var audioContext = thisClone.audioContext;

      if (audioContext !== null) {
        thisClone._updateInfo('Decoding the audio', true);
        audioContext.decodeAudioData(fileResult, function(buffer) {
          thisClone._updateInfo('Decode successful, starting the visualizer', true);
          thisClone._visualize(audioContext, buffer);
        }, function(e) {
          thisClone._updateInfo('!Failure to decode the file', false);
          console.log(e);
        });
      }
    };
    fr.onerror = function(e) {
      thisClone._updateInfo('!Failure to read the file', false);
      console.log(e);
    };
    // assign the file to the reader
    thisClone._updateInfo('Starting to read the file', true);
    fr.readAsArrayBuffer(file);
  },

  _visualize: function(audioContext, buffer) {
    var thisClone = this;
    var audioBufferSouceNode = audioContext.createBufferSource();
    var analyser = audioContext.createAnalyser();
    // connect the source to the analyser
    audioBufferSouceNode.connect(analyser);
    // connect the analyser to the destination (the speaker), or we won't hear the sound
    analyser.connect(audioContext.destination);
    // then assign the buffer to the buffer source node
    audioBufferSouceNode.buffer = buffer;
    // play the source
    if (!audioBufferSouceNode.start) {
      audioBufferSouceNode.start = audioBufferSouceNode.noteOn // in old browsers use noteOn method
      audioBufferSouceNode.stop = audioBufferSouceNode.noteOff // in old browsers use noteOn method
    }
    if (thisClone.source !== null) {
        thisClone.source.stop(0);
    }
    audioBufferSouceNode.start(0);
    thisClone.status = 1;
    thisClone.source = audioBufferSouceNode;
    audioBufferSouceNode.onended = function() {
        thisClone._audioEnd(thisClone);
    };
    thisClone._updateInfo('Playing ' + thisClone.fileName, false);
    thisClone.info = 'Playing ' + thisClone.fileName;
    cancelAnimationFrame(thisClone.animationId);

    // delete any grid that was remaining
    let el = document.getElementById("grid-row-container");
    while(el.firstChild)
      el.removeChild(el.lastChild);

    thisClone._drawSpectrum(analyser);
  },

  _drawSpectrum: function(analyser) {
    var thisClone = this;

    var drawMeter = function() {
      var array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);

      // update every 10 samples
      if(thisClone.numSampled % 10 == 0) {
        // shade of blue in HSV
        let rgbData = HSVtoRGB(3.5953, .42, thisClone.totalPitchData/100+.3);
        let newDiv = document.createElement("div");
        newDiv.style.backgroundColor = `rgb(${rgbData.r},${rgbData.g},${rgbData.b})`;
        newDiv.classList.add("grid-item");

        document.getElementById("grid-row-container").appendChild(newDiv);

        thisClone.numSampled = 1;
        thisClone.totalPitchData = 0;
      }

      for(let i = 0; i < array.length; i += 5)
        thisClone.totalPitchData += array[i];

      thisClone.totalPitchData /= 300;
      thisClone.numSampled++;

      if(thisClone.status === 0) {
        for(let i = 0; i < array.length; ++i)
          array[i] == 0;

        // song is over so cancel the animation
        cancelAnimationFrame(this.animationId);
        return;
      }

      thisClone.animationId = requestAnimationFrame(drawMeter);
    }
    this.animationId = requestAnimationFrame(drawMeter);
  },

  _audioEnd: function(instance) {
    if (this.forceStop) {
      this.forceStop = false;
      this.status = 1;
      return;
    }

    this.status = 0;
    var text = 'Audio Viusalizer';
    document.getElementById('info').innerHTML = text;
    instance.info = text;
    document.getElementById('uploadedFile').value = '';
  },

  _updateInfo: function(text, processing) {
    var thisClone = this;
    var infoBar = document.getElementById('info');
    var dots = '...';
    var i = 0;

    infoBar.innerHTML = text + dots.substring(0, i++);
    if (this.infoUpdateId !== null) {
        clearTimeout(thisClone.infoUpdateId);
    };
    if (processing) {
      // animate dots at the end of the info text
      var animateDot = function() {
        if (i > 3)
          i = 0

        infoBar.innerHTML = text + dots.substring(0, i++);
        thisClone.infoUpdateId = setTimeout(animateDot, 250);
      }
      this.infoUpdateId = setTimeout(animateDot, 250);
    }
  },
}
