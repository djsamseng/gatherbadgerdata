import React, { ReactType } from "react";


import "./App.css";

import { GetGiftsResponse, Gift, SupabaseGift, SupabaseTag, SetGiftDetailsResponse } from "../../server/src/app";
import DataClient from "./DataClient";

function newGift(): Gift {
  return {
    id: 0,
    title: "",
    real_title: "",
    url: "",
    img: "",
    img_amazon_ad: "",
    img_amazon_orig: "",
    iframe: "",
    desc: "",
    real_desc: "",
    price: -1.0,
    score: 0,
    tags: [],
  };
}

type PreviewProps = {
  gift: Gift;
}
type PreviewState = {
  score: number;
};

class Preview extends React.Component<PreviewProps, PreviewState> {
  constructor(props: PreviewProps) {
    super(props);
    this.state = {
      score: props.gift.score,
    }
  }

  public render() {
    const item = this.props.gift;
    let img = (
      <img className="ml-5 mt-1 max-w-xs" src={item.img} alt={item.title}></img>
    );
    return (
      <div className="mt-[-24px] list-none">
        <li className="mt-5 border rounded p-4 border-stone-200 bg-stone-50 hover:bg-white dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800" key={item.id}>
          <a target="_blank" rel="noopener" href={item.url}>
            <p className="text-2xl">{item.title}</p>
            <p className="text-sm">{item.real_title}</p>
            <div className="flex flex-row items-baseline">
              {img}
            </div>
            <p className="mt-1 break-all">{item.desc}</p>
          </a>
          <div className="mt-2 overflow-hidden max-w-5xl">
            {
              item.tags.map(queryMatch => {
                return (
                  <span className="mx-2 border-[1px] px-2 border-stone-200 rounded">{queryMatch}</span>
                );
              })
            }
          </div>
          <div className="mt-1"><span>{item.url.indexOf("amazon") >= 0 ? "Amazon":""} ${item.price}</span></div>
          <div className="mt-1 text-black"><input type="number" value={item.score} onChange={this.onScoreChange.bind(this)}/></div>
        </li>
      </div>
    )
  }
  private onScoreChange(evt: React.ChangeEvent<HTMLInputElement>) {
    this.props.gift.score = parseInt(evt.target.value, 10);
    this.setState({
      score: this.props.gift.score,
    })
  }
}

type GiftFormProps = {
  gift?: Gift;
  refresh: () => {};
}
type GiftFormState = {
  id: number;
  title: string;
  real_title: string;
  amazon: string;
  img: string;
  url: string;
  tags: string;
  desc: string;
  real_desc: string;
  price: number;
  score: number;

  preview?: GetGiftsResponse["gifts"][string],
}
class GiftForm extends React.Component<GiftFormProps, GiftFormState> {
  constructor(props: GiftFormProps) {
    super(props);
    const state = {
      id: -1,
      title: "",
      real_title: "",
      amazon: "",
      img: "",
      url: "",
      tags: "",
      desc: "",
      real_desc: "",
      price: -1.0,
      score: 0,
    };
    if (this.props.gift) {
      state.id = this.props.gift.id;
      state.title = this.props.gift.title;
      state.real_title = this.props.gift.real_title;
      state.amazon = this.props.gift.img_amazon_orig || "";
      state.img = this.props.gift.img;
      state.url = this.props.gift.url;
      state.tags = this.props.gift.tags.join(",");
      state.desc = this.props.gift.desc || "";
      state.real_desc = this.props.gift.real_desc;
      state.price = this.props.gift.price;
      state.score = this.props.gift.score;
    }
    this.state = state;
  }

  public render() {
    const entries = [
      { label: "Id",                        name: "id",          handler: this.textFieldUpdate.bind(this), disabled: true,  },
      { label: "Title",                     name: "title",       handler: this.textFieldUpdate.bind(this), },
      { label: "Amazon Large Image String", name: "amazon",      handler: this.textFieldUpdate.bind(this), },
      { label: "Tags Comma Seperated",      name: "tags",        handler: this.textFieldUpdate.bind(this), },
      { label: "Real Title",                name: "real_title",  handler: this.textFieldUpdate.bind(this), },
      { label: "Custom Image",              name: "img",         handler: this.textFieldUpdate.bind(this), },
      { label: "Custom Link",               name: "url",         handler: this.textFieldUpdate.bind(this), },
      { label: "Description",               name: "desc",        handler: this.textFieldUpdate.bind(this), },
      { label: "Real Description",          name: "real_desc",   handler: this.textFieldUpdate.bind(this), },
      { label: "Price",                     name: "price",       handler: this.textFieldUpdate.bind(this), },
      { label: "Score",                     name: "score",       handler: this.textFieldUpdate.bind(this), }
    ]


    const items:Array<any> = [];
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
    });
    const preview = this.state.preview ? (<Preview gift={this.state.preview}/>) : null;
    return (
      <div className="flex flex-col items-stretch">
        <form className="grid grid-cols-3 gap-4 m-2" onSubmit={this.onSubmit.bind(this)}>
          { items.map(item => item) }
          <button type="button" onClick={this.onPreview.bind(this)} className="border rounded border-white col-span-1 hover:bg-gray-5">Preview</button>
          <button type="submit" className="border rounded border-white col-span-1 hover:bg-gray-5">Add</button>
        </form>
        <div className="flex flex-col items-stretch">
          { preview }
        </div>
      </div>

    );
  }

  private textFieldUpdate(evt: React.ChangeEvent<HTMLInputElement>) {
    evt.preventDefault();
    if (evt.target.name === "price") {
      let price = parseFloat(evt.target.value);
      this.setState({
        price,
      });
    }
    else if (evt.target.name === "score") {
      let score = parseInt(evt.target.value);
      this.setState({
        score,
      })
    }
    else if (evt.target.name === "id") {
      let id = parseInt(evt.target.value);
      this.setState({
        id,
      });
    }
    else {
      this.setState({
        [evt.target.name]: evt.target.value,
      } as any);
    }
  }

  private onPreview(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    const gift = this.getGiftFromState();
    this.setState({
      preview: gift,
    })
  }

  private async onSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const gift = this.getGiftFromState();
    await DataClient.upsertGift(gift);
    this.props.refresh();
  }

  private getGiftFromState(): GetGiftsResponse["gifts"][string] {
    let url = "";
    let img = "";
    let amazon_img_ad = undefined;
    if (this.state.amazon.length > 0) {
      const parts = this.state.amazon.split(`"`);
      let parsed = this.parseAmazonParts(parts);
      url = parsed.url;
      img = parsed.img;
      amazon_img_ad = parsed.amazon_img_ad;
    }
    else if (this.state.img.length > 0 && this.state.url.length > 0) {
      img = this.state.img;
      url = this.state.url;
    }
    const gift: Gift = {
      id: this.state.id,
      title: this.state.title,
      real_title: this.state.real_title,
      url: url,
      img: img,
      img_amazon_ad: amazon_img_ad,
      img_amazon_orig: this.state.amazon,
      price: this.state.price,
      score: this.state.score,
      tags: this.state.tags.split(","),
      desc: this.state.desc,
      real_desc: this.state.real_desc,
    };
    return gift;
  }

  private parseAmazonParts(parts: Array<string>) {
    let url = "";
    let img = "";
    let amazon_img_ad = undefined;
    console.assert(parts.length === 21);
    console.assert(parts[0] === "<a href=");
    url = parts[1];
    console.assert(parts[2] === " target=");
    console.assert(parts[3] === "_blank");
    console.assert(parts[4] === "><img border=");
    console.assert(parts[5] === "0");
    console.assert(parts[6] === " src=");
    img = parts[7];
    console.assert(parts[8] === " ></a><img src=");
    amazon_img_ad = parts[9];
    console.assert(parts[10] === " width=");
    console.assert(parts[11] === "1");
    return {
      url,
      img,
      amazon_img_ad
    };
  }
}

type AppProps = {};
type AppState = {
  gifts: GetGiftsResponse["gifts"];
  editGift?: Gift;
  searchText: string;
  showGifts: boolean;
};

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      gifts: {},
      editGift: undefined,
      searchText: "",
      showGifts: false,
    }
  }

  public componentDidMount() {
    this.getGifts();
  }

  public render() {
    const gifts = Object.values(this.state.gifts).sort((a, b) => {
      if (a.score === b.score) {
        return a.id - b.id;
      }
      return b.score - a.score;
    });
    const giftsVis = gifts.map(gift => {
        let tag = (<div></div>);
        if (gift.img_amazon_orig && gift.img_amazon_orig.length > 0) {
          tag = (<div className="text-lg">Amazon Link</div>)
        }
        return (
          <div>
          <div key={gift.id} className="flex flex-row items-center justify-items-stretch">
            <div className="flex-1 flex flex-col items-stretch my-2">
              <Preview gift={gift} />
              {tag}
            </div>
            {
              gift === this.state.editGift ?
              (
                <button type="button" className="border rounded bg-blue-800 border-white px-2 mx-2" onClick={this.onEdit.bind(this, gift)}>Edit</button>
              ) :
              (
                <button type="button" className="border rounded border-white px-2 mx-2" onClick={this.onEdit.bind(this, gift)}>Edit</button>
              )
            }

            <button type="button" className="border rounded border-white px-2 mx-2" onClick={this.onDelete.bind(this, gift)}>Delete</button>
          </div>
          {
            gift === this.state.editGift ? (
              <div>
                <GiftForm key={gift.id} refresh={this.getGifts.bind(this)} gift={gift}/>
              </div>
            ) : (
              <div></div>
            )
          }
          </div>

        );
      });
    return (
        <div className="App">
          <div className="App-header">
            <div className="my-14 w-full">
              <GiftForm key={this.state.editGift ? this.state.editGift.id : 0} refresh={this.getGifts.bind(this)} gift={this.state.editGift}/>
            </div>
            <div className="mb-10 space-x-2">
              <button type="button" className="border rounded border-white px-2" onClick={this.onShowGifts.bind(this)}>Show Gifts</button>
              <button type="button" className="border rounded border-white px-2" onClick={this.onExport.bind(this)}>Export</button>
              <button type="button" className="border rounded border-white px-2" onClick={this.onSort.bind(this)}>Sort</button>
              <button type="button" className="border rounded border-white px-2" onClick={this.onUpdateAll.bind(this)}>Update All</button>
              <button type="button" className="border rounded border-white px-2" onClick={this.onResetSearchIndex.bind(this)}>Reset Search Index</button>
              <button type="button" className="border rounded border-white px-2" onClick={this.onInitLocal.bind(this)}>Init Local Database</button>
            </div>
            <form className="mb-10 space-x-2 w-3/4 flex flex-col items-stretch" onSubmit={this.onSearchSubmit.bind(this)}>
              <input type="text" className="text-black flex-1" value={this.state.searchText} onChange={this.onSearchTextChange.bind(this)} />
              <button type="submit" className="border rounded border-white px-2 mt-2" onClick={this.onSearch.bind(this)}>Search</button>
            </form>
            <ul className="mb-10 list-none flex flex-col items-stretch">
              { this.state.showGifts ? giftsVis : (<div></div>) }
            </ul>
          </div>

        </div>
    )
  }

  private async onEdit(gift: Gift, evt: React.MouseEvent<HTMLButtonElement>, ) {
    evt.preventDefault();
    if (gift === this.state.editGift) {
      this.setState({
        editGift: undefined,
      });
    }
    else {
      this.setState({
        editGift: gift,
      });
    }

  }

  private async onDelete(gift: Gift, evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    await DataClient.deleteGift(gift);
    this.getGifts();
  }

  private async onExport(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    await DataClient.onExport(this.state.gifts);
  }

  private async onShowGifts(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    this.setState({
      showGifts: true,
    })
  }

  private async onInitLocal(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    await DataClient.initLocalDatabase();
  }

  private async onSort(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    this.forceUpdate();
  }

  private async onUpdateAll(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    for (const gift of Object.values(this.state.gifts)) {
      await DataClient.upsertGift(gift);
    }
    await this.getGifts();
  }

  private async onResetSearchIndex(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    await DataClient.resetSearchIndex();
  }

  private async onSearchTextChange(evt: React.ChangeEvent<HTMLInputElement>) {
    evt.preventDefault();
    this.setState({
      searchText: evt.target.value,
    });
  }

  private async onSearch(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    await this.getGifts();
  }

  private async onSearchSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    await this.getGifts();
  }

  private async getGifts() {
    const gifts = await DataClient.searchGifts(this.state.searchText);
    this.setState({
      gifts,
      editGift: newGift(),
    })
  }
}

export default App;