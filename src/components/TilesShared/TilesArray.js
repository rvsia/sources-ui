import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { shallowEqual, useSelector } from 'react-redux';
import { routes } from '../../Routes';

import { Tile } from '@patternfly/react-core/dist/esm/components/Tile/Tile';

import { useHasWritePermissions } from '../../hooks/useHasWritePermissions';
import DisabledTile from '../TilesShared/DisabledTile';
import { filterVendorTypes } from '../../utilities/filterTypes';

const TilesArray = ({ setSelectedType, mapper }) => {
  const sourceTypes = useSelector(({ sources }) => sources.sourceTypes, shallowEqual);
  const activeVendor = useSelector(({ sources }) => sources.activeVendor);

  const { push } = useHistory();
  const hasWritePermissions = useHasWritePermissions();

  const openWizard = (type) => {
    setSelectedType(type);
    push(routes.sourcesNew.path);
  };

  const TileComponent = hasWritePermissions ? Tile : DisabledTile;

  return sourceTypes
    .filter(filterVendorTypes(activeVendor))
    .sort((a, b) => a.product_name.localeCompare(b.product_name))
    .map(({ name }) => mapper(name, openWizard, TileComponent));
};

TilesArray.propTypes = {
  setSelectedType: PropTypes.func.isRequired,
  mapper: PropTypes.func.isRequired,
};

export default TilesArray;
