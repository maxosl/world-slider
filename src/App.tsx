import React from 'react';
import WorldSlider from './WorldSlider'; // adjust the path if needed

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>World Map Highlighter</h1>
      </header>
      <main>
        <WorldSlider />
      </main>
    </div>
  );
};

export default App;