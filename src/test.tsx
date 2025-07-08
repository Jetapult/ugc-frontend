import {Composition, registerRoot, Video} from 'remotion';

// Test component with video and text overlay
const TestComponent = () => {
  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        width: '100%', 
        height: '100%',
        backgroundColor: 'purple'
      }}/>
      
      {/* Simple Remotion Video element with hard-coded source */}
      <Video
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Text overlay */}
      <h1 style={{
        position: 'absolute',
        color: 'white',
        fontSize: '5rem',
        bottom: '10%',
        width: '100%',
        textAlign: 'center',
        zIndex: 10,
        textShadow: '0px 0px 10px rgba(0,0,0,0.8)'
      }}>
        VIDEO TEST
      </h1>
    </div>
  );
};

// Register the root component with fixed values - no props needed
const TestRoot = () => {
  return (
    <Composition
      id="MainComposition"
      component={TestComponent}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={90}
    />
  );
};

registerRoot(TestRoot);
