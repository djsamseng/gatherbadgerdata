import React from "react";
import axios from "axios";
import "./App.css";

import { GetGiftsResponse } from "../../server/src/app";

const BASE_URL = "http://localhost:4000";

type AppProps = {};
type AppState = {
  gifts: string;
};

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      gifts: "Loading"
    }
  }

  public componentDidMount() {
    this.getGifts();
  }

  public render() {
    return (
      <div className="App">
        <header className="App-header">
          <p style={{width: "100%", height: "100%"}}>{this.state.gifts}</p>
        </header>

      </div>
    )
  }

  private async getGifts() {
    const resp = await axios.post(BASE_URL + "/getgifts", {});
    const data: GetGiftsResponse = resp.data;
    console.log("Gifts: ", data.gifts);
    this.setState({
      gifts: JSON.stringify(data.gifts, null, 4),
    })
  }
}

export default App;