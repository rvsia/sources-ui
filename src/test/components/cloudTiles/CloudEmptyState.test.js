import React from 'react';
import { act } from 'react-dom/test-utils';

import { Card } from '@patternfly/react-core/dist/esm/components/Card/Card';
import { Tooltip } from '@patternfly/react-core/dist/esm/components/Tooltip/Tooltip';
import { Tile } from '@patternfly/react-core/dist/esm/components/Tile/Tile';

import componentWrapperIntl from '../../../utilities/testsHelpers';
import CloudEmptyState from '../../../components/CloudTiles/CloudEmptyState';
import CloudTiles from '../../../components/CloudTiles/CloudTiles';
import mockStore from '../../__mocks__/mockStore';
import sourceTypes, { googleType } from '../../__mocks__/sourceTypesData';
import { CLOUD_VENDOR } from '../../../utilities/constants';

describe('CloudEmptyState', () => {
  let wrapper;
  let setSelectedType;
  let initialProps;
  let store;

  beforeEach(() => {
    setSelectedType = jest.fn();

    initialProps = {
      setSelectedType,
    };

    store = mockStore({
      user: { isOrgAdmin: true },
      sources: { sourceTypes: [...sourceTypes.data, googleType], activeVendor: CLOUD_VENDOR },
    });
  });

  it('renders correctly', async () => {
    await act(async () => {
      wrapper = mount(componentWrapperIntl(<CloudEmptyState {...initialProps} />, store));
    });
    wrapper.update();

    expect(wrapper.find(Card)).toHaveLength(1);
    expect(wrapper.find(CloudTiles)).toHaveLength(1);
    expect(wrapper.find(Tile)).toHaveLength(3);
    expect(wrapper.find('img')).toHaveLength(3);

    expect(wrapper.find(Tile).first().props().isDisabled).toEqual(undefined);
    expect(wrapper.find(Tile).last().props().isDisabled).toEqual(undefined);
    expect(wrapper.find(Tooltip)).toHaveLength(0);
  });
});
