import * as pc from 'playcanvas';
window.pc = pc;
import basisGlueUrl from './lib/basis.wasm.js?url';
import basisWasmUrl from './lib/basis.wasm.wasm?url';
import basisFallbackUrl from './lib/basis.js?url';
import ammoGlueUrl from './lib/ammo.wasm.js?url';
import ammoWasmUrl from './lib/ammo.wasm.wasm?url';
import ammoFallbackUrl from './lib/ammo.js?url';
import firstPersonMovementUrl from './lib/first-person-movement?url';
import postEffectSsaoUrl from './lib/posteffect-ssao?url'
import postEffectSepiaUrl from './lib/posteffect-sepia?url'
import postEffectBloomUrl from './lib/posteffect-bloom?url'
import postEffectHueSaturationUrl from './lib/posteffect-hue-saturation?url'
import { registerScripts, 
  STREAM_CONTROLLER_SCRIPT_NAME, 
  STREAMING_MODEL_SCRIPT_NAME,
  EVENT_LOAD } from '@polygon-streaming/web-player-playcanvas';
import { isIos } from './utils';

let MODEL_URL;
if (import.meta.env.DEV) {
  MODEL_URL = '/model.xrg';
} else {
  MODEL_URL = 'https://d2s1xgv6f13wzb.cloudfront.net/markhorgan/steampunk-city.xrg';
}

pc.WasmModule.setConfig('Ammo', {
  glueUrl: ammoGlueUrl,
  wasmUrl: ammoWasmUrl,
  fallbackUrl: ammoFallbackUrl
});
pc.WasmModule.getInstance('Ammo', ammoLibraryLoaded);

async function ammoLibraryLoaded() {
  const canvas = document.getElementById('application');
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    keyboard: new pc.Keyboard(window),
    touch: new pc.TouchDevice(canvas),
    elementInput: new pc.ElementInput(canvas)
  });

  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 1);

  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);

  window.addEventListener('resize', () => app.resizeCanvas());

  registerScripts();

  const assets = {
    ssao: new pc.Asset('ssao', 'script', { url: postEffectSsaoUrl }),
    //sepia: new pc.Asset('sepia', 'script', { url: postEffectSepiaUrl }),
    //bloom: new pc.Asset('bloom', 'script', { url: postEffectBloomUrl }),
    hueSaturation: new pc.Asset('hueSaturation', 'script', { url: postEffectHueSaturationUrl }),
    firstPersonMovement: new pc.Asset('first-person-movement', 'script', { url: firstPersonMovementUrl })
  };

  const assetListLoader = new pc.AssetListLoader(Object.values(assets), app.assets);
  assetListLoader.load(() => {
    pc.basisInitialize({
      glueUrl: basisGlueUrl,
      wasmUrl: basisWasmUrl,
      fallbackUrl: basisFallbackUrl,
    });

    // Camera
    const camera = new pc.Entity('camera');
    const cameraComponent = camera.addComponent('camera', {
      clearColor: new pc.Color(0, 0, 0),
      nearClip: 0.01
    });
    cameraComponent.toneMapping = pc.TONEMAP_ACES;
    camera.addComponent('script');
    camera.script.create('ssao', {
      attributes: {
        enabled: true,
        radius: 2,
        samples: 16,
        brightness: 0,
        downscale: 1
      }
    });
    /*camera.script.create('sepia', {
      attributes: {
        enabled: true,
        amount: 0.6
      }
    });*/
    /*camera.script.create('bloom', {
      attributes: {
        enabled: true,
        intensity: 0.6,
        threshold: 0.8,
        blurAmount: 15
      }
    });*/
    camera.script.create('hueSaturation', {
      attributes: {
        enabled: true,
        hue: 0,
        saturation: 0.1
      }
    });

    // Fog
    const fogParams = app.scene.fog;
    fogParams.color = new pc.Color(0.3, 0.3, 0.3);
    fogParams.end = 140;
    fogParams.type = pc.FOG_LINEAR;

    app.start();

    // Player
    const player = new pc.Entity('player');
    player.setPosition(7, 2, 2);
    player.addComponent('collision', {
      type: 'capsule',
      radius: 0.4,
      height: 1.8,
      axis: 1
    });
    const playerRigidBodyComponent = player.addComponent('rigidbody', {
      type: 'dynamic',
      mass: 100,
      enabled: false,
      linearDamping: 0.99,
      angularFactor: new pc.Vec3(0, 0, 0)
    });
    player.addChild(camera);
    camera.setLocalPosition(0, 1, 0);
    player.addComponent('script');
    player.script.create('firstPersonMovement', {
      attributes: {
        camera,
        power: 2500,
        lockSpeed: 0.25
      }
    });
    app.root.addChild(player);

    const lightColor = new pc.Color(237/255, 176/255, 102/255);

    // Ambient light
    app.scene.ambientLight = lightColor;
    app.scene.ambientLight.intensity = 0.3;
    
    // Sun
    const sunLight = new pc.Entity();
    sunLight.addComponent('light', {
      type: 'directional',
      color: lightColor,
      intensity: 1,
      castShadows: true,
      normalOffsetBias: 0.05,
      shadowResolution: 2048,
      shadowDistance: 100
    });
    sunLight.setEulerAngles(-30, -145, 0);
    app.root.addChild(sunLight);

    // Skybox
    const prefix = 'cubemap_';
    const suffixes = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
    const fileExtension = '.jpg';
    const textureAssetIds = [];
    for (let i = 0; i < 6; i++) {
      const textureAsset = new pc.Asset(`skybox-texture-${i}`, 'texture', {
        url: `images/${prefix}${suffixes[i]}${fileExtension}`,
      });
      textureAssetIds.push(textureAsset.id);
      app.assets.add(textureAsset);
      app.assets.load(textureAsset);
    }
    const cubemapAsset = new pc.Asset(
      'skybox-cubemap',
      'cubemap',
      {
        url: `images/${prefix}prefiltered.jpg`,
      },
      {
        textures: textureAssetIds,
        magFilter: 1,
        minFilter: 5,
        anisotropy: 1,
      }
    );
    cubemapAsset.loadFaces = true;
    app.assets.add(cubemapAsset);
    app.assets.load(cubemapAsset);

    const streamController = new pc.Entity('Stream Controller');
    streamController.addComponent('script');
    streamController.script.create(STREAM_CONTROLLER_SCRIPT_NAME, {
      attributes: { 
        camera,
        cameraType: 'nonPlayer',
        occlusionCulling: true,
        occlusionGeometry: 'boundingBox',
        occlusionQueryFrequency: 8,
        triangleBudget: 5000000,
        mobileTriangleBudget: 3000000,
        closeUpDistance: 3,
        minimumDistance: 0.01,
        distanceFactor: 1.1,
        maximumQuality: 15000,
        closeUpDistanceFactor: 5,
        iosMemoryLimit: 0
      }
    });
    app.root.addChild(streamController);

    const streamingModel = new pc.Entity('Streaming Model');
    streamingModel.addComponent('script');
    const streamingModelScript = streamingModel.script.create(STREAMING_MODEL_SCRIPT_NAME, {
      attributes: {
        path: MODEL_URL,
        qualityPriority: 1,
        useAlpha: true,
        useMetalRoughness: true,
        castShadows:  true,
        castLightmapShadows: true,
        receiveShadows: true,
        doubleSidedMaterials: false,
        initialTrianglePercent: 0.1,
        playAnimationAutomatically: true
      }
    });
    streamingModelScript.once(EVENT_LOAD, () => {
      playerRigidBodyComponent.enabled = true;
      app.scene.setSkybox(cubemapAsset.resources);
      document.getElementById('loading').style.display = 'none';
      //document.getElementById('buttons').style.display = 'flex';

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('auto-play-audio')) {
        document.addEventListener('mousedown', function() {
          playAudio()
        })
      }
    });

    streamController.addChild(streamingModel);
  });
}

// Audio
// ---------------------------------------------------------

const audioElement = new Audio('When_You_Gotta_Go_You_Gotta_Go.mp3');
audioElement.loop = true;
audioElement.preload = 'auto';
audioElement.volume = 0.75;

// Buttons
// ---------------------------------------------------------

/*if (!isIos()) {
  document.getElementById('button-fullscreen').style.visibility = 'visible'
}*/

const elementFullscreen = function(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen()
    //@ts-ignore
  } else if (element.webkitRequestFullscreen) {
    //@ts-ignore
    element.webkitRequestFullscreen()
    //@ts-ignore
  } else if (element.msRequestFullscreen) {
    //@ts-ignore
    element.msRequestFullscreen()
  }
}

const fullScreenButtonEl = document.getElementById('button-fullscreen')
fullScreenButtonEl.addEventListener('click', function(event) {
  elementFullscreen(renderer.domElement);
  event.stopPropagation();
  event.stopImmediatePropagation();
});

const toggleAudio = function() {
  if (audioElement.paused) {
    audioElement.play()
  } else {
    audioElement.muted = !audioElement.muted
  }
  if (audioElement.muted) {
    muteButtonEl.classList.add('is-muted')
    muteButtonEl.classList.remove('is-unmuted')
  } else {
    muteButtonEl.classList.add('is-unmuted')
    muteButtonEl.classList.remove('is-muted')
  }
}

const playAudio = function() {
  audioElement.play()
  muteButtonEl.classList.add('is-unmuted')
  muteButtonEl.classList.remove('is-muted')
}

const muteButtonEl = document.getElementById('button-mute')
muteButtonEl.addEventListener('click', function(event) {
  toggleAudio();
  event.stopPropagation();
  event.stopImmediatePropagation();
});

document.addEventListener('keydown', function(event) {
  const key = event.key.toLowerCase();

  switch(key) {
    case 'm':
      toggleAudio();
      break;
  }
});