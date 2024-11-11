import React from 'react';
import WorldSlider from './WorldSlider'; // adjust the path if needed
import DemoMap from './DemoMap';

const App: React.FC = () => {
  return (
    <div className="App">
      <main>
        {/* <WorldSlider /> */}
        <DemoMap />
      </main>
    </div>
  );
};

export default App;