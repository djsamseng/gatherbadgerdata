
import React from "react";
import { SupabaseGift } from "../../server/src/app";
import DataClient from "./DataClient";
import { getItemGrid } from "./Prod";

const DIR_NAME = "/home/samuel/dev/thecial/data/lists";

type ListGift = {
  id: number;
  title: string;
  img: string;
  url: string;
  list_desc: string;
  order: number;
}
export type ListJson = {
  title: string;
  slug: string;
  gifts: Array<ListGift>;
};
type GiftWithTag = SupabaseGift & {
  tags: Array<{ tag: string }>;
};

const GiftPreview = ({ gift, children }: { gift: GiftWithTag, children: React.ReactNode }) => {
  let img = (
    <img className="ml-5 mt-1 max-w-xs" src={gift.img} alt={gift.title}></img>
  );
  return (
    <div className="mt-[-24px] list-none">
      <li className="mt-5 border rounded p-4 border-stone-200 bg-stone-50 hover:bg-white " key={gift.id}>
        <a target="_blank" rel="noopener" href={gift.url}>
          <p className="text-2xl">{gift.title}</p>
          <p className="text-sm">{gift.real_title}</p>
          <div className="flex flex-row items-baseline">
            {img}
          </div>
        </a>
        <div className="mt-1"><span>{gift.url.indexOf("amazon") >= 0 ? "Amazon":""} ${gift.price}</span></div>
        <div className="mt-1 text-black"><span>{gift.score}</span></div>
        { children }
      </li>
    </div>
  );
}

type ListsProps = {};
type ListsState = {
  gifts: Record<string, GiftWithTag>;
  lists: Array<ListJson>;
  editList?: ListJson;
};

class Lists extends React.Component<ListsProps, ListsState> {
  constructor(props: ListsProps) {
    super(props);
    this.state = {
      gifts: {},
      lists: [],
      editList: undefined,
    }
  }

  public render() {
    const listHeaders = this.state.lists.map(l => {
      return {
        title: l.title,
        slug: l.slug,
        num_gifts: l.gifts.length,
        edit: (<button type="button" className="px-5 border rounded" onClick={this.onEditList.bind(this, l)}>Edit</button>)
      };
    });
    return (
      <div>
        <div className="flex flex-col items-center space-y-5">
          <div className="flex flex-row items-center space-x-2">
            <button type="button" className="border-2 rounded px-4 py-3 border-slate-500 hover:bg-gray-600" onClick={this.onShowAllLists.bind(this)}>Show All Lists</button>
            <button type="button" className="border-2 rounded px-4 py-3 border-slate-500 hover:bg-gray-600" onClick={this.onExportLists.bind(this)}>Export Lists</button>
          </div>
          {
            this.state.editList ? (
              <div>
                <label className="space-x-2">
                  Title
                  <input className="border rounded px-5 py-2 ml-2" type="text" value={this.state.editList.title} onChange={this.onEditListTitleChange.bind(this)}></input>
                </label>
                <label className="space-x-2">
                  Title
                  <input className="border rounded px-5 py-2" type="text" value={this.state.editList.slug} onChange={this.onEditListSlugChange.bind(this)}></input>
                </label>
                <h2 className="text-7xl text-black text-center">In List</h2>
                {
                  this.state.editList.gifts.map(g => {
                    const gift = this.state.gifts[g.id];
                    return (
                      <div>
                        <GiftPreview gift={gift}>
                          <button type="button" className="border-2 rounded" onClick={this.onRemoveFromEditList.bind(this, g)}>Remove</button>
                          <input type="number" className="border-2 rounded" value={g.order} onChange={this.onOrderEditListChange.bind(this, g)}></input>
                        </GiftPreview>
                      </div>

                    )
                  })
                }
                <h2 className="text-7xl text-black text-center">All Gifts</h2>
                {
                  Object.values(this.state.gifts).filter(g => this.state.editList?.gifts.map(g => g.id).indexOf(g.id) === -1)
                  .map(g => {
                    return (
                      <div>
                        <button type="button" className="border rounded px-5 py-3" onClick={this.onAddGiftToList.bind(this, g)}>{g.title}</button>
                      </div>

                    )
                  })
                }
              </div>
            ): (
              <div>
                <h2 className="text-7xl text-black text-center">Lists</h2>
                <div className="grid grid-cols-4 gap-2 m-2 gap-y-5">
                  { getItemGrid(listHeaders) }
                </div>
              </div>

            )
          }

        </div>
      </div>
    )
  }

  public componentDidMount() {
    this.getLists();
  }

  private async onExportLists(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();


    await DataClient.writeFiles(DIR_NAME, this.state.lists);
  }

  private async getLists() {
    const lists = await DataClient.getFilesInDir(DIR_NAME);
    this.setState({
      lists,
    });
    const gifts = await DataClient.getSupabaseDbGiftsWithTags();
    const giftsMap = gifts.reduce((map, g) => {
      map[g.id] = g;
      return map;
    }, {} as Record<string, GiftWithTag>);
    this.setState({
      gifts: giftsMap,
    });
  }

  private async onEditList(listItem: ListJson, evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    this.setState({
      editList: listItem,
    });
  }

  private async onShowAllLists(evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    this.setState({
      editList: undefined,
    });
  }

  private onRemoveFromEditList(gift: ListGift, evt: React.MouseEvent<HTMLButtonElement>) {
    evt.preventDefault();
    const newLists = this.state.lists.map(l => {
      if (l === this.state.editList) {
        l.gifts = l.gifts.filter(g => g.id !== gift.id);
      }
      return l;
    });
    this.setState({
      lists: newLists,
    })
  }

  private onAddGiftToList(gift: GiftWithTag, evt: React.MouseEvent<HTMLButtonElement>) {
    const newListGift: ListGift = {
      id: gift.id,
      title: gift.title,
      img: gift.img,
      url: gift.url,
      list_desc: "",
      order: this.state.editList!.gifts.length,
    }
    const newLists = this.state.lists.map(l => {
      if (l === this.state.editList) {
        l.gifts.push(newListGift);
      }
      return l;
    });
    this.setState({
      lists: newLists,
    })
  }

  private onEditListTitleChange(evt: React.ChangeEvent<HTMLInputElement>) {
    evt.preventDefault();
    const editList = this.state.editList;
    editList!.title = evt.target.value;
    this.setState({
      editList,
    });
  }

  private onEditListSlugChange(evt: React.ChangeEvent<HTMLInputElement>) {
    evt.preventDefault();
    const editList = this.state.editList;
    editList!.slug = evt.target.value;
    this.setState({
      editList,
    });
  }

  private onOrderEditListChange(gift: ListGift, evt: React.ChangeEvent<HTMLInputElement>) {
    evt.preventDefault();
    const editList = this.state.editList;
    const newPos = parseInt(evt.target.value);
    if (newPos >= editList!.gifts.length || newPos < 0) {
      return;
    }
    const oldPos = gift.order;
    gift.order = newPos;
    editList!.gifts[newPos].order = oldPos;
    editList!.gifts.splice(oldPos, 1);
    editList!.gifts.splice(newPos, 0, gift);
    this.setState({
      editList,
    });
  }
}

export default Lists;