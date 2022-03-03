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
  amazon: string;
  img: string;
  url: string;
  tags: string;
}
class GiftForm extends React.Component<GiftFormProps, GiftFormState> {
  constructor(props: GiftFormProps) {
    super(props);
    const state = {
      id: "",
      title: "",
      amazon: "",
      img: "",
      url: "",
      tags: "",
    };
    if (this.props.gift) {
      state.id = this.props.gift.id;
      state.title = this.props.gift.title;
      state.tags = this.props.gift.tags.join(",")
    }
    this.state = state;
  }

  public render() {
    const entries = [
      { label: "Id",                        name: "id",     handler: this.textFieldUpdate.bind(this), disabled: true,  },
      { label: "Title",                     name: "title",  handler: this.textFieldUpdate.bind(this), },
      { label: "Amazon Large Image String", name: "amazon", handler: this.textFieldUpdate.bind(this), },
      { label: "Custom Image",              name: "img",    handler: this.textFieldUpdate.bind(this), },
      { label: "Custom Link",               name: "url",    handler: this.textFieldUpdate.bind(this), },
      { label: "Tags Comma Seperated",      name: "tags",   handler: this.textFieldUpdate.bind(this), },
    ]
    const items:Array<any> = [];
    console.log(this.state);
    entries.forEach(entry => {
      const inputId = `input${entry.name}`;
      items.push(
        (
          <div className="col-span-1">
            <label htmlFor={inputId}><span>{entry.label} </span></label>
          </div>
        )
      );
      items.push(
        (
          <div className="col-span-2 flex flex-col items-stretch mx-2 text-black">
            <input
              id={inputId}
              name={entry.name}
              type="text"
              disabled={entry.disabled}
              className="disabled:bg-gray-500"
              value={(this.state as any)[entry.name]}
              onChange={entry.handler} />
          </div>
        )
      )
    })
    return (
      <form className="grid grid-cols-3 gap-4 m-2">
        { items.map(item => item) }
      </form>
    );
  }

  private textFieldUpdate(evt: React.ChangeEvent<HTMLInputElement>) {
    evt.preventDefault();
    console.log(evt.target.name);
    this.setState({
      [evt.target.name]: evt.target.value,
    } as any);
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
          <div className="my-14 w-full">
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