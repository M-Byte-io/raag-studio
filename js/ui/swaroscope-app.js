import { globalEventBus, EVENTS } from '../engine/architecture/event-bus.js';
import { createEmptySession } from '../engine/architecture/session-schema.js';
import { TeacherCommentAnnotation } from '../engine/architecture/annotation-schema.js';
import { syncManager } from '../engine/synchronization-manager.js';
import { DAWTimelineEngine } from './swaroscope/daw-timeline-engine.js';
import { RecordingEngine } from '../engine/recording-engine.js';
import { contourDB } from '../engine/contour-database.js';
import { pluginManager } from '../engine/architecture/plugin-architecture.js';
import { GamakAnalysisPlugin } from '../engine/plugins/gamak-analysis-plugin.js';
import { AIFeedbackPlugin } from '../engine/plugins/ai-feedback-plugin.js';

// Register plugins
pluginManager.register(new GamakAnalysisPlugin());
pluginManager.register(new AIFeedbackPlugin());

export class SwaroscopeApp {
  constructor() {
    this.session = createEmptySession();
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // UI Elements
    this.canvas = document.getElementById('swaroscopeCanvas');
    this.audioEl = document.getElementById('masterAudio');
    this.uploadInput = document.getElementById('audioUploadInput');
    this.uploadBtn = document.getElementById('uploadAudioBtn');
    this.playBtn = document.getElementById('dawPlayBtn');
    this.pauseBtn = document.getElementById('dawPauseBtn');
    this.micBtn = document.getElementById('scopeStartBtn');
    
    // Engines
    this.dawEngine = new DAWTimelineEngine(this.canvas);
    this.recordingEngine = new RecordingEngine(this.audioCtx);
    
    // Worker
    this.extractionWorker = new Worker('/js/audio/pitch-extraction-worker.js', { type: 'module' });
    
    this._bindEvents();
    syncManager.bindAudio(this.audioEl);
    
    // Initial render
    this.dawEngine.loadProject(this.session);
  }

  _bindEvents() {
    // 1. Upload Workflow (Phase 8)
    this.uploadBtn.addEventListener('click', () => this.uploadInput.click());
    this.uploadInput.addEventListener('change', (e) => this._handleUpload(e));
    
    // 2. Transport (Phase 7)
    this.playBtn.addEventListener('click', () => {
      this.audioCtx.resume();
      this.audioEl.play();
      this.playBtn.style.display = 'none';
      this.pauseBtn.style.display = 'inline-block';
    });
    
    this.pauseBtn.addEventListener('click', () => {
      this.audioEl.pause();
      this.pauseBtn.style.display = 'none';
      this.playBtn.style.display = 'inline-block';
    });

    globalEventBus.on(EVENTS.PLAYBACK_STARTED, () => {
      this.playBtn.style.display = 'none';
      this.pauseBtn.style.display = 'inline-block';
    });
    
    globalEventBus.on(EVENTS.PLAYBACK_PAUSED, () => {
      this.pauseBtn.style.display = 'none';
      this.playBtn.style.display = 'inline-block';
    });
    
    // Phase 14: Teacher Comments
    globalEventBus.on('TEACHER_COMMENT_ADDED', (payload) => {
      const comment = new TeacherCommentAnnotation();
      comment.startSec = payload.time;
      comment.endSec = payload.time + 5; // Default 5 second region
      comment.textComment = payload.comment;
      
      this.session.annotations.push(comment);
      this.dawEngine.loadProject(this.session);
      contourDB.saveSession(this.session);
    });

    // 3. Microphone Recording (Phase 4 wiring)
    this.micBtn.addEventListener('click', async () => {
      if (this.recordingEngine.isRecording) {
        const userTrack = this.recordingEngine.stopRecording();
        this.micBtn.textContent = '🎤 Enable Mic';
        this.micBtn.classList.remove('active');
        
        // Add to session
        let userGroup = this.session.trackGroups.find(g => g.id === 'user-group');
        if (!userGroup) {
          userGroup = { id: 'user-group', name: 'User Takes', isVisible: true, isMuted: false, isSoloed: false, isCollapsed: false, tracks: [] };
          this.session.trackGroups.push(userGroup);
        }
        
        // Remove the temporary live track and add the finalized one
        this.dawEngine.tracks = this.dawEngine.tracks.filter(t => t !== this.recordingEngine.activeTrack);
        userGroup.tracks.push(userTrack);
        
        // Run AI Analysis plugins (Phase 12 Gamak, Phase 11 AI Feedback, etc.)
        pluginManager.runAnalysis(this.session);
        
        this.dawEngine.loadProject(this.session);
        
        // Stop playback/virtual clock
        if (this.audioEl.getAttribute('src')) {
          this.audioEl.pause();
        } else {
          syncManager.stopVirtualClock();
        }
        
        // Save to DB
        contourDB.saveSession(this.session);
      } else {
        await this.audioCtx.resume();
        await this.recordingEngine.prepare();
        this.recordingEngine.startRecording();
        
        // Push live track into DAWTimelineEngine so it draws!
        if (this.recordingEngine.activeTrack) {
          if (!this.dawEngine.tracks.includes(this.recordingEngine.activeTrack)) {
             this.dawEngine.tracks.push(this.recordingEngine.activeTrack);
          }
        }
        
        // Start playhead
        if (this.audioEl.getAttribute('src')) {
           this.audioEl.currentTime = 0;
           this.audioEl.play();
        } else {
           syncManager.startVirtualClock();
        }
        
        this.micBtn.textContent = '⏹ Stop Mic';
        this.micBtn.classList.add('active');
      }
    });

    // 4. Worker Messages
    this.extractionWorker.onmessage = (e) => {
      const { type, payload, error } = e.data;
      if (type === 'EXTRACTION_COMPLETE') {
        const refTrack = payload;
        
        // Add reference track to session
        let refGroup = this.session.trackGroups.find(g => g.id === 'ref-group');
        if (!refGroup) {
          refGroup = { id: 'ref-group', name: 'Reference', isVisible: true, isMuted: false, isSoloed: false, isCollapsed: false, tracks: [] };
          this.session.trackGroups.push(refGroup);
        }
        refGroup.tracks = [refTrack]; // Replace if exists
        
        this.dawEngine.loadProject(this.session);
        contourDB.saveSession(this.session);
        
        // Provide feedback
        const aiText = document.getElementById('aiGuruText');
        if (aiText) aiText.textContent = "Reference audio analyzed successfully.";
      } else if (type === 'EXTRACTION_ERROR') {
        console.error("Extraction failed:", error);
        alert("Audio extraction failed.");
      }
    };
  }

  async _handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Set audio element source
    const fileUrl = URL.createObjectURL(file);
    this.audioEl.src = fileUrl;
    
    // Decode audio for offline extraction
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    const pcmData = audioBuffer.getChannelData(0); // Mix to mono if stereo
    
    const aiFeedback = document.getElementById('aiGuruFeedback');
    const aiText = document.getElementById('aiGuruText');
    if (aiFeedback && aiText) {
      aiFeedback.style.display = 'block';
      aiText.textContent = `Extracting pitch contour and feature tracks for ${file.name}...`;
    }

    // Send to worker (Phase 8)
    this.extractionWorker.postMessage({
      type: 'EXTRACT_REFERENCE',
      payload: {
        buffer: pcmData,
        sampleRate: audioBuffer.sampleRate,
        id: crypto.randomUUID()
      }
    });
  }
}
