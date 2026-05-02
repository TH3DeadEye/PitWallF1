with open("frontend/src/components/CircuitMap.jsx", "r") as f:
    content = f.read()

# I will use multi_replace_file_content or a fresh file write.
# Actually I'll just write it to a temp file and replace it.
