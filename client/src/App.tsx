import React from "react";
import axios from "axios";
import "./App.css";

const BASE_URL = "http://localhost:4000";

type AppProps = {};
type AppState = {};

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
  }

  public componentDidMount() {
    this.makeRequest();
  }

  public render() {
    return (
      <div className="App">
        <header className="App-header">
          <p>Edit <code>client/src/App.tsx</code></p>
        </header>
      </div>
    )
  }

  private async makeRequest() {
    const resp = await axios.post(BASE_URL + "/goto", {
      test: "test!"
    });
    console.log("Test request response:", resp);
  }
}

export default App;