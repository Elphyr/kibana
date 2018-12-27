/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

// import routing from '../../../services/routing';
import { extractQueryParams } from '../../../services/query_params';
import { API_STATUS } from '../../../constants';
import { SectionLoading, SectionError } from '../../../components';
import { FollowerIndicesTable, DetailPanel } from './components';

const REFRESH_RATE_MS = 30000;

const getQueryParamName = ({ location: { search } }) => {
  const { name } = extractQueryParams(search);
  return name ? decodeURIComponent(name) : null;
};

export const FollowerIndicesList = injectI18n(
  class extends PureComponent {
    static propTypes = {
      loadFollowerIndices: PropTypes.func,
      selectFollowerIndex: PropTypes.func,
      followerIndices: PropTypes.array,
      apiStatus: PropTypes.string,
      apiError: PropTypes.object,
    }

    static getDerivedStateFromProps({ followerIndexId }, { lastFollowerIndexId }) {
      if (followerIndexId !== lastFollowerIndexId) {
        return {
          lastFollowerIndexId: followerIndexId,
          isDetailPanelOpen: !!followerIndexId,
        };
      }
      return null;
    }

    state = {
      lastFollowerIndexId: null,
      isDetailPanelOpen: false,
    };

    componentDidMount() {
      const { loadFollowerIndices, selectFollowerIndex, history } = this.props;

      loadFollowerIndices();

      // Select the pattern in the URL query params
      selectFollowerIndex(getQueryParamName(history));

      // Interval to load follower indices in the background passing "true" to the fetch method
      this.interval = setInterval(() => loadFollowerIndices(true), REFRESH_RATE_MS);
    }

    componentDidUpdate(prevProps, prevState) {
      const { history } = this.props;
      const { lastFollowerIndexId } = this.state;

      /**
       * Each time our state is updated (through getDerivedStateFromProps())
       * we persist the follower index id to query params for deep linking
       */
      if (lastFollowerIndexId !== prevState.lastFollowerIndexId) {
        if(!lastFollowerIndexId) {
          history.replace({
            search: '',
          });
        } else {
          history.replace({
            search: `?name=${encodeURIComponent(lastFollowerIndexId)}`,
          });
        }
      }
    }

    componentWillUnmount() {
      clearInterval(this.interval);
    }

    renderEmpty() {
      return (
        <EuiEmptyPrompt
          iconType="managementApp"
          title={(
            <h1>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.emptyPromptTitle"
                defaultMessage="Create your first follower index"
              />
            </h1>
          )}
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexList.emptyPromptDescription"
                  defaultMessage="Use a follower to start replicating operations from
                    the leader index to the follower index."
                />
              </p>
            </Fragment>
          }
          actions={
            <EuiButton
              //{...routing.getRouterLinkProps('/follower_indices/add')}
              fill
              iconType="plusInCircle"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.addFollowerButtonLabel"
                defaultMessage="Create a follower index"
              />
            </EuiButton>
          }
        />
      );
    }

    renderList() {
      const {
        selectFollowerIndex,
        followerIndices,
        apiStatus,
      } = this.props;

      const { isDetailPanelOpen } = this.state;

      if (apiStatus === API_STATUS.LOADING) {
        return (
          <SectionLoading>
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexList.loadingTitle"
              defaultMessage="Loading follower indices..."
            />
          </SectionLoading>
        );
      }

      return (
        <Fragment>
          <FollowerIndicesTable followerIndices={followerIndices} />
          {isDetailPanelOpen && <DetailPanel closeDetailPanel={() => selectFollowerIndex(null)} />}
        </Fragment>
      );
    }

    render() {
      const { followerIndices, apiStatus, apiError, isAuthorized, intl } = this.props;

      if (!isAuthorized) {
        return null;
      }

      if (apiStatus === API_STATUS.IDLE && !followerIndices.length) {
        return this.renderEmpty();
      }

      if (apiError) {
        const title = intl.formatMessage({
          id: 'xpack.crossClusterReplication.followerIndexList.loadingErrorTitle',
          defaultMessage: 'Error loading follower indices',
        });
        return <SectionError title={title} error={apiError} />;
      }

      return this.renderList();
    }
  }
);
