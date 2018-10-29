import * as React from "react";
import { RouteComponentProps } from "react-router-dom";
import { Container, Grid, Header, Segment } from "semantic-ui-react";
import { Icon, Logo } from "../../atoms/";
import { Default } from "../../templates";

class Home extends React.Component<RouteComponentProps> {
    public render(): React.ReactNode {
        const pageProps = this.props;
        return (
            <Default {...pageProps}>
                <Grid>
                    <Grid.Row>
                        <Grid.Column>
                            <Segment inverted={true} vertical={true} textAlign="center">
                                <Container>
                                    <Logo speed="10s" />
                                    <Header as="h1" inverted={true}>Welcome to TypeScript + React</Header>
                                    <p>Includes Semantic UI React, Redux and much more!</p>
                                </Container>
                            </Segment>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
                <Grid container={true} divided="vertically">
                    <Grid.Row>
                        <Grid.Column>
                            <Header as="h2">
                                <Icon
                                    iconType="ui"
                                    iconName="checkmark"
                                    className="a-icon--before-text"
                                />
                                Atomic Design
                            </Header>
                            <p>Popularly known within the design world, Atomic Design helps to build consistent, solid and reusable design systems. Plus, in the world of React, Vue and frameworks that stimulate the componentization, Atomic Design is used unconsciously; but when used in the right way, it becomes a powerful ally for developers.</p>
                            <p>The name Atomic Design comes from the idea of separating the components in atoms, molecules, organisms, templates and pages, like in the image above. But what are the responsibilities of each separated part?</p>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                        <Grid.Column>
                            <Header as="h3">Atoms</Header>
                        </Grid.Column>
                        <Grid.Column>
                            <p>Atoms are the smallest possible components, such as buttons, titles, inputs or event color pallets, animations, and fonts. They can be applied on any context, globally or within other components and templates, besides having many states, such as this example of button: disabled, hover, different sizes, etc.</p>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                        <Grid.Column>
                            <Header as="h3">Molecules</Header>
                        </Grid.Column>
                        <Grid.Column>
                            <p>They are the composition of one or more components of atoms. Here we begin to compose complex components and reuse some of those components. Molecules can have their own properties and create functionalities by using atoms, which don’t have any function or action by themselves.</p>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={2}>
                        <Grid.Column>
                            <Header as="h3">Organisms</Header>
                        </Grid.Column>
                        <Grid.Column>
                            <p>Organisms are the combination of molecules that work together or even with atoms that compose more elaborate interfaces. At this level, the components begin to have the final shape, but they are still ensured to be independent, portable and reusable enough to be reusable in any content.</p>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </Default>
        );
    }
}

export default Home;
