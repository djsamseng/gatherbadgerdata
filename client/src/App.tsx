import React from "react";
import axios from "axios";
import "./App.css";

import { GetGiftsResponse } from "../../server/src/app";

const BASE_URL = "http://localhost:4000";

type GiftFormProps = {
  gift?: GetGiftsResponse["gifts"][string];
}
type GiftFormState = {
  id: string;
  title: string;
  amazonString: string;
  customLink: string;
  customImage: string;
  tags: string;
}
class GiftForm extends React.Component<GiftFormProps, GiftFormState> {
  constructor(props: GiftFormProps) {
    super(props);
  }

  public render() {
    return (
      <form className="flex flex-col items-end space-y-2 mx-14">
        <label className="space-x-1">
          <span>Id </span>
          <input type="text" disabled={true} className="disabled:bg-gray-500"/>
        </label>
        <label className="space-x-1">
          <span>Title </span>
          <input type="text"/>
        </label>
        <label className="space-x-1">
          <span> Amazon Large Image String</span>
          <input type="text"/>
        </label>
        <label className="space-x-1">
          <span> Custom Link</span>
          <input type="text"/>
        </label>
        <label className="space-x-1">
          <span> Custom Image</span>
          <input type="text"/>
        </label>
        <label className="space-x-1">
          <span> Tags comma seperated</span>
          <input type="text"/>
        </label>
      </form>
    );
  }
}

type AppProps = {};
type AppState = {
  gifts: GetGiftsResponse["gifts"];
};

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      gifts: {},
    }
  }

  public componentDidMount() {
    this.getGifts();
  }

  public render() {
    return (
      <div className="App">
        <div className="App-header">
          <div className="mb-14 w-full">
            <GiftForm />
          </div>
          <ul style={{listStyle: "none"}}>
            {
              Object.values(this.state.gifts).map(gift => {
                return (
                  <li style={{marginBottom: "5px"}} key={gift.id}>
                    <span>id={gift.id} title={gift.title} url={gift.url} img={gift.img}</span>
                    <br />
                    <span>  {gift.tags.map(tag => tag + " ")}</span>
                  </li>
                )
              })
            }
          </ul>
        </div>

      </div>
    )
  }

  private async getGifts() {
    const resp = await axios.post(BASE_URL + "/getgifts", {});
    const data: GetGiftsResponse = resp.data;
    console.log("Gifts: ", data.gifts);
    this.setState({
      gifts: data.gifts
    })
  }
}

export default App;