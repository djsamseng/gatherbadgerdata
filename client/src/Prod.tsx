
import React from "react";
import { SupabaseGift, SupabaseTag } from "../../server/src/app";
import DataClient, { SupabaseSearchIndex } from "./DataClient";

export function getItemGrid(items: Array<any>) {
  if (items.length === 0) {
    return (<div></div>);
  }
  const header = Object.keys(items[0]).map(key => {
    return (
      <div className="text-black col-span-1" key={key}>{key}</div>
    );
  })
  const details = items.map(item => {
    return Object.values(item).map((giftVal: any, idx:number) => {
      return (
        <div className="text-black col-span-1 h-7 overflow-hidden border" key={`${item.id}-${idx}`}>{giftVal}</div>
      )
    });
  })
  return [
    header,
    details,
  ];
}

type ProdState = {
  gifts: Array<SupabaseGift>;
  tags: Array<SupabaseTag>;
  search_index: Array<SupabaseSearchIndex>;
  confirmationChecked: boolean;
}
class Prod extends React.Component<{}, ProdState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      gifts: [],
      tags: [],
      search_index: [],
      confirmationChecked: false,
    };
  }

  public render() {
    return (
      <div>
        <div className="flex flex-col items-center">
          <div className="flex flex-row items-center">
            <label>
              Check to Confirm
              <input type="checkbox" className="mx-2" checked={this.state.confirmationChecked} onChange={this.onConfirmationCheck.bind(this)}></input>
            </label>
            <button type="submit" className="border-4 p-5 border-slate-500 hover:bg-gray-600" onClick={this.onUploadToProd.bind(this)}>Upload To Prod</button>
          </div>
          <h2 className="text-7xl text-black text-center">GIFTS</h2>
          <div className="grid grid-cols-12 gap-2 m-2 gap-y-5">
            { getItemGrid(this.state.gifts)}
          </div>
          <h2 className="text-7xl text-black text-center">TAGS</h2>
          <div className="grid grid-cols-2 gap-2 m-2 gap-y-5">
            { getItemGrid(this.state.tags)}
          </div>
          <h2 className="text-7xl text-black text-center">SEARCH_INDEX</h2>
          <div className="grid grid-cols-3 gap-2 m-2 gap-y-5">
            { getItemGrid(this.state.search_index)}
          </div>
        </div>
      </div>
    )
  }

  public componentDidMount() {
    this.getDataFromJsonFiles();
  }

  private async getDataFromJsonFiles() {
    const {gifts, tags, search_index} = await DataClient.getPendingGifts();
    this.setState({
      gifts,
      tags,
      search_index
    });
  }

  private onConfirmationCheck() {
    this.setState({confirmationChecked: !this.state.confirmationChecked})
  }

  private onUploadToProd(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    if (this.state.confirmationChecked) {
      DataClient.uploadPendingToProd({
        gifts: this.state.gifts,
        tags: this.state.tags,
        search_index: this.state.search_index,
      });
    }
  }
}

export default Prod;