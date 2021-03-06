import { FieldProps } from "formik";
import * as React from "react";
import ReactMde, { commands } from "react-mde";

const ReactMarkdown = require("react-markdown");

interface IProps {
  onChange: any;
}

interface IState {
  selectedTab: "write"|"preview";
}

type Props = FieldProps<any> & IProps;

export default class MarkdownField extends React.Component<Props, IState> {

  constructor(props: Props) {
    super(props);

    this.state = {
      selectedTab: "write",
    };
  }

  public render(): RenderOutput {
    const { field, onChange } = this.props;

    // Hacky way to turn off tab selection of buttons in the toolbar
    const defaultCommands = commands.getDefaultCommands();
    const usedCommands = defaultCommands;
    defaultCommands.forEach((commandGroup, i) => {
      commandGroup.commands.forEach((command, j) => {
        const noTabCommand = defaultCommands[i].commands[j];
        noTabCommand.buttonProps["tabIndex"] = -1;
        usedCommands[i].commands[j] = noTabCommand;
      });
    });

    return (
      <div>
        <ReactMde
          commands={usedCommands}
          generateMarkdownPreview={(markdown) =>
            Promise.resolve(<ReactMarkdown source={markdown} />)
          }
          maxEditorHeight={84}
          minEditorHeight={84}
          minPreviewHeight={74}
          onChange={onChange}
          onTabChange={(tab) => { this.setState({ selectedTab: tab}); }}
          selectedTab={this.state.selectedTab}
          value={field.value}
        />
      </div>
    );
  }
}
