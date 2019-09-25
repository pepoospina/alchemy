import { IDAOState } from "@daostack/client";
import * as React from "react";
import { BreadcrumbsItem } from "react-breadcrumbs-dynamic";
import * as Sticky from "react-stickynode";
import * as css from "./Dao.scss";

interface IProps {
  dao: IDAOState;
}

export default class DaoDiscussionPage extends React.Component<IProps, null> {

  public render(): RenderOutput {
    const dao = this.props.dao;

    return(
      <div>
        <BreadcrumbsItem to={"/dao/" + dao.address + "/discussion"}>Discussion</BreadcrumbsItem>

        <Sticky enabled top={50} innerZ={10000}>
          <div className={css.daoHistoryHeader}>
            Wiki of {dao.name}
          </div>
        </Sticky>

        <div>
          TBD
        </div>
      </div>
    );
  }
}
