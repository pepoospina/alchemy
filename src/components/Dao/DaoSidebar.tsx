import { IDAOState, Token } from "@daostack/client";
import { getArc } from "arc";

import BN = require("bn.js");
import * as classNames from "classnames";
import withSubscription, { ISubscriptionProps } from "components/Shared/withSubscription";
import * as GeoPattern from "geopattern";
import { formatTokens, getExchangesList, supportedTokens } from "lib/util";
import * as React from "react";
import { Link } from "react-router-dom";
import * as css from "./Dao.scss";

interface IProps {
  dao: IDAOState;
}

interface IState {
  openMenu: boolean;
}

export default class DaoSidebar extends React.Component<IProps, IState> {

  constructor(props: IProps) {
    super(props);
    this.state = {
      openMenu: false,
    };
  }

  public handleOpenMenu(_event: any): void {
    this.setState({ openMenu: !this.state.openMenu });
  }

  public render(): RenderOutput {
    const dao = this.props.dao;
    const daoHoldingsAddress = "https://etherscan.io/tokenholdings?a=" + dao.address;
    const bgPattern = GeoPattern.generate(dao.address + dao.name);

    const menuClass = classNames({
      [css.openMenu]: this.state.openMenu,
      [css.daoSidebar]: true,
      clearfix: true,
    });

    return (
      <div className={menuClass}>
        <div className={css.menuToggle} onClick={this.handleOpenMenu.bind(this)}>
          <img className={css.menuClosed} src="/assets/images/Icon/Menu.svg"/>
          <img className={css.menuOpen} src="/assets/images/Icon/Close.svg"/>
        </div>
        <div className={css.daoNavigation}>
          <div className={css.daoName}>
            <Link to={"/dao/" + dao.address}>
              <b className={css.daoIcon} style={{ backgroundImage: bgPattern.toDataUrl() }}></b>
              <em></em>
              <span>{dao.name}</span>
            </Link>
          </div>
          <div className={css.daoDescription}>
            {dao.name === "dxDAO" ?
              <p>
                By submitting a proposal, you agree to be bound by the&nbsp;
                <a href="https://cloudflare-ipfs.com/ipfs/QmRQhXUKKfUCgsAf5jre18T3bz5921fSfvnZCB5rR8mCKj" target="_blank" rel="noopener noreferrer">Participation Agreement</a>, which includes the terms of participation in the dxDAO
              </p>
              : dao.name === "Meme" ?
                <p><a href="https://docs.google.com/document/d/1iJZfjmOK1eZHq-flmVF_44dZWNsN-Z2KAeLqW3pLQo8" target="_blank" rel="noopener noreferrer">Learn how to MemeDAO</a></p>
                : dao.name === "ETHBerlin dHack.io" ?
                  <p>
                  For more info join our TG group -
                    <a href="https://t.me/dhack0" target="_blank" rel="noopener noreferrer">t.me/dhack0</a>
                  </p>
                  : dao.name === "Identity" ?
                    <p>
                  A curated registry of identities on the Ethereum blockchain.&nbsp;
                      <a href="https://docs.google.com/document/d/1_aS41bvA6D83aTPv6QNehR3PfIRHJKkELnU76Sds5Xk" target="_blank" rel="noopener noreferrer">How to register.</a>
                    </p>
                    : <p>Anyone can make a proposal to the DAO! Click the button on the top right.</p>
            }
          </div>
          <div className={css.navigation}>
            <span className={css.navHeading}><b>Menu</b></span>
            <ul>
              <li>
                <Link to={"/dao/" + dao.address}>
                  <span className={css.menuDot} />
                  <span className={
                    classNames({
                      [css.notification]: true,
                      [css.homeNotification]: true,
                    })
                  }></span>
                  <img src="/assets/images/Icon/menu/home.svg" />
                  Home
                </Link>
              </li>
              <li>
                <Link to={"/dao/" + dao.address + "/members/"}>
                  <span className={css.menuDot} />
                  <span className={
                    classNames({
                      [css.notification]: true,
                      [css.holdersNotification]: true,
                    })
                  }></span>
                  <img src="/assets/images/Icon/menu/holders.svg" />
                  Reputation Holders
                </Link>
              </li>
              <li>
                <Link to={"/dao/" + dao.address + "/history/"}>
                  <span className={css.menuDot} />
                  <span className={
                    classNames({
                      [css.notification]: true,
                      [css.historyNotification]: true,
                    })
                  }></span>
                  <img src="/assets/images/Icon/menu/history.svg" />
                  History
                </Link>
              </li>
              <li>
                <Link to={"/dao/" + dao.address + "/discussion/"}>
                  <span className={css.menuDot} />
                  <span className={
                    classNames({
                      [css.notification]: true,
                      [css.discussionNotification]: true,
                    })
                  }></span>
                  <img src="/assets/images/Icon/menu/chat.svg" />
                  DAO Wiki
                </Link>
              </li>
            </ul>
          </div>
          <div className={css.daoHoldings}>
            <span className={css.navHeading}>
              <b>DAO Holdings</b>
              <a href={daoHoldingsAddress}>
                <img src="/assets/images/Icon/link-white.svg" />
              </a>
            </span>
            <ul>
              <SubscribedEthBalance dao={dao} />

              {Object.keys(supportedTokens()).map((tokenAddress) => {
                return <SubscribedTokenBalance tokenAddress={tokenAddress} dao={dao} key={"token_" + tokenAddress} />;
              })}
            </ul>
          </div>
          <div className={css.menuWrapper}>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li>
                <a>Buy GEN</a>
                <ul>
                  <div className={css.diamond}></div>
                  {
                    getExchangesList().map((item: any) => {
                      return (
                        <li key={item.name}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <b><img src={item.logo} /></b>
                            <span>{item.name}</span>
                          </a>
                        </li>
                      );
                    })
                  }
                </ul>
              </li>
              <li><a href="https://daostack.zendesk.com/hc" target="_blank" rel="noopener noreferrer">Help Center</a></li>
              <li><a href="https://hub.gendao.org/" target="_blank" rel="noopener noreferrer">Get Involved</a></li>
              <li><a href="https://cloudflare-ipfs.com/ipfs/Qmf4HafH1QiryBun7j2g9inp78Njrkt635WJ943rBQyWyy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li className={css.daoStack}>
                <a href="http://daostack.io" target="_blank" rel="noopener noreferrer">
                  <img src="/assets/images/Icon/dao-logo.svg" /> DAOstack
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

/***** DAO ETH Balance *****/
interface IEthProps extends ISubscriptionProps<any> {
  dao: IDAOState;
}
const ETHBalance = (props: IEthProps) => {
  const { data } = props;

  return <li key="ETH"><strong>{formatTokens(new BN(data))}</strong> ETH</li>;
};

const SubscribedEthBalance = withSubscription({
  wrappedComponent: ETHBalance,
  loadingComponent: <li key="ETH">... ETH</li>,
  errorComponent: null,
  checkForUpdate: (oldProps: IEthProps, newProps: IEthProps) => {
    return oldProps.dao.address !== newProps.dao.address;
  },
  createObservable: (props: IEthProps) => {
    const arc = getArc();
    return arc.dao(props.dao.address).ethBalance();
  },
});

/***** Token Balance *****/
interface ITokenProps extends ISubscriptionProps<any> {
  dao: IDAOState;
  tokenAddress: string;
}
const TokenBalance = (props: ITokenProps) => {
  const { data, error, isLoading, tokenAddress } = props;

  const tokenData = supportedTokens()[tokenAddress];
  if (isLoading || error || (data.isZero() && tokenData.symbol !== "GEN")) {
    return null;
  }

  return (
    <li key={tokenAddress}>
      <strong>{formatTokens(data, tokenData["symbol"], tokenData["decimals"])}</strong>
    </li>
  );
};

const SubscribedTokenBalance = withSubscription({
  wrappedComponent: TokenBalance,
  checkForUpdate: (oldProps: ITokenProps, newProps: ITokenProps) => {
    return oldProps.dao.address !== newProps.dao.address || oldProps.tokenAddress !== newProps.tokenAddress;
  },
  createObservable: (props: ITokenProps) => {
    const arc = getArc();
    const token = new Token(props.tokenAddress, arc);
    return token.balanceOf(props.dao.address);
  },
});
