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
import { registerScripts, 
  STREAM_CONTROLLER_SCRIPT_NAME, 
  STREAMING_MODEL_SCRIPT_NAME,
  EVENT_LOAD } from '@polygon-streaming/web-player-playcanvas';

const MODEL_URL = 'https://d2s1xgv6f13wzb.cloudfront.net/markhorgan/steampunk-city.xrg';
//const MODEL_URL = '/model.xrg';

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
    touch: new pc.TouchDevice(window),
  });

  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 2);

  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);

  window.addEventListener('resize', () => app.resizeCanvas());

  registerScripts();

  const assets = {
    ssao: new pc.Asset('ssao', 'script', { url: postEffectSsaoUrl }),
    sepia: new pc.Asset('sepia', 'script', { url: postEffectSepiaUrl }),
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
        radius: 3,
        samples: 16,
        brightness: 0,
        downscale: 1
      }
    });
    camera.script.create('sepia', {
      attributes: {
        enabled: true,
        amount: 0.4
      }
    });

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

    const lightColor = new pc.Color(237/255, 187/255, 126/255);

    // Ambient light
    app.scene.ambientLight = lightColor;
    app.scene.ambientLight.intensity = 0.3;
    
    // Sun
    const sunLight = new pc.Entity();
    sunLight.addComponent('light', {
      type: 'directional',
      color: lightColor,
      intensity: 1.5,
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
    const fileExtension = '.png';
    const textureAssetIds = [];
    for (let i = 0; i < 6; i++) {
      const textureAsset = new pc.Asset(`skybox-texture-${i}`, 'texture', {
        url: `assets/${prefix}${suffixes[i]}${fileExtension}`,
      });
      textureAssetIds.push(textureAsset.id);
      app.assets.add(textureAsset);
      app.assets.load(textureAsset);
    }
    const cubemapAsset = new pc.Asset(
      'skybox-cubemap',
      'cubemap',
      {
        url: `assets/${prefix}prefiltered.png`,
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
        occlusionCulling: false,
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
    });

    streamController.addChild(streamingModel);
  });
}
