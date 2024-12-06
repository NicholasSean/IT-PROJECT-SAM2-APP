import PropTypes from 'prop-types';
import { RxCross2 } from 'react-icons/rx';
import '../styles/Thumbnail.css';

const Thumbnail = ({ image, index, isSelected, onSelect, onDelete }) => (
  <div className={`img-thumbnail ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(index)}>
    <RxCross2
      className="img-delete-icon"
      onClick={(e) => {
        // prevent click event from focusing thumbnail
        e.stopPropagation();
        onDelete(index);
      }}
    />
    <img
      src={image.src}
      alt={`Source image #${index + 1}`}
      className={isSelected ? 'selected' : ''}
    />
    <p id={`img-label-${index}`} className="img-label">
      {image.name}
    </p>
  </div>
);

Thumbnail.propTypes = {
  image: PropTypes.shape({
    src: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default Thumbnail;
