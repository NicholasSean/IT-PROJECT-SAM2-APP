import '../styles/Prompt.css';

const Prompt = () => {
  return (
    <div className="prompt">
      <div className="prompt-text">
        Upload an image <br />
        to begin
      </div>

      <div className="down-arrow-container">
        <div className="line" />
        <div className="arrow-head" />
      </div>
    </div>
  );
};

export default Prompt;
