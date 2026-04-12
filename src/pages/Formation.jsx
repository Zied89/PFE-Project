function Formation() {
  const categories = [
    "Développement Web",
    "Design Graphique",
    "Marketing Digital",
    "Intelligence Artificielle"
  ];

  return (
    <div>
      <h2>Catégories de formation</h2>

      {categories.map((cat, index) => (
        <div key={index}>{cat}</div>
      ))}
    </div>
  );
}

export default Formation;