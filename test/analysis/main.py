import matplotlib.pyplot as plt
import numpy as np
import json
import os
import sys
import polars as pl
import pandas as pd
import matplotlib.ticker as ticker
import seaborn as sns


def load_json(file_path):
    """
    Load a JSON file and return its content.
    """
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist.")
        exit(1)
    with open(file_path, "r") as file:
        data = json.load(file)
    return data


def load_folder(folder_path):
    """
    Load all JSON files from a folder and return their content.
    """
    if not os.path.exists(folder_path):
        print(f"Folder {folder_path} does not exist.")
        exit(1)
    data = []
    for filename in os.listdir(folder_path):
        if filename.endswith(".json"):
            file_path = os.path.join(folder_path, filename)
            data += load_json(file_path)
    return data


def get_measures_dataframe(data, topic, name):
    """
    Filters a list of measure dictionaries by topic and name and returns a pandas DataFrame.

    Args:
      data: A list of dictionaries, where each dictionary represents a measure.
      topic: The topic to filter by.
      name: The name to filter by.

    Returns:
      A pandas DataFrame containing the filtered measures with columns
      'id', 'value', 'unit', 'source_site', and 'destination_site'.
      Returns an empty DataFrame if no matching measures are found.
    """
    filtered_data = []
    for item in data:
        if item.get("topic") == topic and item.get("name") == name:
            # Create a new dictionary with only the desired columns
            filtered_data.append(
                {
                    "value": item.get("value"),
                    "unit": item.get("unit"),
                    "source_site": item.get("source_site"),
                    "destination_site": item.get("destination_site"),
                }
            )

    # Create DataFrame from the filtered data
    df = pl.DataFrame(filtered_data)

    return df


def analyze_speed_dataframe(df: pl.DataFrame, name: str, output_unit: str = "ns"):
    """
    Analyzes speed data in a Polars DataFrame by site and site combination,
    allowing for unit selection and providing a same-site vs. different-site
    comparison.

    Calculates average, 95th percentile, min, max, count, and standard deviation
    for speed values, grouped by source/destination sites. Generates a bar
    chart visualizing average speeds per combination.

    Args:
        df: A Polars DataFrame with columns 'value' (speed in ns), 'source_site',
            and 'destination_site'.
        name: A string describing the measure (e.g., 'getProducts'). Used in titles.
        output_unit: The desired unit for the output values ('ns', 'us', 'ms', 's').
                     Input values are assumed to be in nanoseconds ('ns').

    Returns:
        A tuple containing three Polars DataFrames:
        - DataFrame with stats for all source-destination combinations.
        - DataFrame with stats for same-site requests (source_site == destination_site).
        - DataFrame with stats for different-site requests (source_site != destination_site).
    """
    if df.is_empty():
        print(
            f"Input DataFrame for '{name}' is empty. No analysis or plotting possible."
        )
        return pl.DataFrame(), pl.DataFrame(), pl.DataFrame()

    print(f"\n--- Analyzing speed data for '{name}' (Output Unit: {output_unit}) ---")

    # Define conversion factors from nanoseconds (ns)
    conversion_factors = {
        "ns": 1,
        "us": 1e-3,  # 1 microsecond = 1000 nanoseconds
        "ms": 1e-6,  # 1 millisecond = 1,000,000 nanoseconds
        "s": 1e-9,  # 1 second = 1,000,000,000 nanoseconds
    }

    if output_unit not in conversion_factors:
        print(f"Warning: Invalid output_unit '{output_unit}'. Defaulting to 'ns'.")
        output_unit = "ns"

    conversion_factor = conversion_factors[output_unit]

    # Apply conversion to the 'value' column
    df_converted = df.with_columns(
        (pl.col("value") * conversion_factor).alias(f"value_{output_unit}")
    )

    # Use the converted value column for aggregations
    value_col_name = f"value_{output_unit}"
    average_col_name = f"average_{output_unit}"
    median_col_name = f"median_{output_unit}"
    percentile_col_name = f"percentile_95_{output_unit}"
    min_col_name = f"min_{output_unit}"
    max_col_name = f"max_{output_unit}"
    std_col_name = f"std_dev_{output_unit}"

    # --- 1. Analysis for all source-destination combinations ---
    print("\nCalculating statistics for all source -> destination combinations...")
    all_combinations_stats = (
        df_converted.group_by(["source_site", "destination_site"], maintain_order=True)
        .agg(
            [
                pl.col(value_col_name).mean().alias(average_col_name),
                pl.col(value_col_name).median().alias(median_col_name),
                pl.col(value_col_name).quantile(0.95).alias(percentile_col_name),
                pl.col(value_col_name).min().alias(min_col_name),
                pl.col(value_col_name).max().alias(max_col_name),
                pl.col(value_col_name).std().alias(std_col_name),
                pl.col(value_col_name).count().alias("count"),
            ]
        )
        .sort(["source_site", "destination_site"])
    )

    print("\nStatistics for all combinations:")
    # Display all float columns in scientific notation
    print(
        all_combinations_stats.select(
            pl.exclude("source_site", "destination_site", "count")
            .cast(pl.Float64)
            .name.suffix("_float"),
            pl.col("source_site", "destination_site", "count"),
        )
    )

    # --- 2. Analysis for same-site requests ---
    print(
        "\nCalculating statistics for same-site requests (source_site == destination_site)..."
    )
    same_site_stats = (
        df_converted.filter(pl.col("source_site") == pl.col("destination_site"))
        .group_by("source_site", maintain_order=True)
        .agg(
            [
                pl.col(value_col_name).mean().alias(average_col_name),
                pl.col(value_col_name).median().alias(median_col_name),
                pl.col(value_col_name).quantile(0.95).alias(percentile_col_name),
                pl.col(value_col_name).min().alias(min_col_name),
                pl.col(value_col_name).max().alias(max_col_name),
                pl.col(value_col_name).std().alias(std_col_name),
                pl.col(value_col_name).count().alias("count"),
            ]
        )
        .sort("source_site")
    )

    print("\nStatistics for same-site requests:")
    # Display all float columns in scientific notation
    print(
        same_site_stats.select(
            pl.exclude("source_site", "count").cast(pl.Float64).name.suffix("_float"),
            pl.col("source_site", "count"),
        )
    )

    # --- 3. Analysis for different-site requests ---
    print(
        "\nCalculating statistics for different-site requests (source_site != destination_site)..."
    )
    different_site_stats = (
        df_converted.filter(pl.col("source_site") != pl.col("destination_site"))
        .group_by(["source_site", "destination_site"], maintain_order=True)
        .agg(
            [
                pl.col(value_col_name).mean().alias(average_col_name),
                pl.col(value_col_name).median().alias(median_col_name),
                pl.col(value_col_name).quantile(0.95).alias(percentile_col_name),
                pl.col(value_col_name).min().alias(min_col_name),
                pl.col(value_col_name).max().alias(max_col_name),
                # pl.col(value_col_name).std().alias(std_col_name),
                pl.col(value_col_name).count().alias("count"),
            ]
        )
        .sort(["source_site", "destination_site"])
    )

    print("\nStatistics for different-site requests:")
    # Display all float columns in scientific notation
    print(
        different_site_stats.select(
            pl.exclude("source_site", "destination_site", "count")
            .cast(pl.Float64)
            .name.suffix("_float"),
            pl.col("source_site", "destination_site", "count"),
        )
    )

    # --- 4. Statistical Comparison (Same Site vs. Different Site) ---
    print("\n--- Same Site vs. Different Site Comparison ---")

    # Calculate overall averages for same-site and different-site
    # WARN: LSP error c'est normal elle sont pas la au runtime, c'est juste le typechecker qui se chie dessus
    same_site_avg: float = same_site_stats[average_col_name].mean()
    different_site_avg: float = different_site_stats[average_col_name].mean()

    same_site_95p: float = same_site_stats[percentile_col_name].mean()
    different_site_95p: float = different_site_stats[percentile_col_name].mean()

    print(f"\nOverall Average ({output_unit}):")
    if same_site_avg is not None:
        print(f"  Same Site: {same_site_avg:.4e}")
    else:
        print("  Same Site: No data")

    if different_site_avg is not None:
        print(f"  Different Site: {different_site_avg:.4e}")
    else:
        print("  Different Site: No data")

    print(f"\nOverall 95th Percentile ({output_unit}):")
    if same_site_95p is not None:
        print(f"  Same Site: {same_site_95p:.4e}")
    else:
        print("  Same Site: No data")

    if different_site_95p is not None:
        print(f"  Different Site: {different_site_95p:.4e}")
    else:
        print("  Different Site: No data")

    print("\nComparison Summary:")
    if same_site_avg is not None and different_site_avg is not None:
        avg_diff = different_site_avg - same_site_avg
        # Avoid division by zero if same_site_avg is zero
        avg_percent_diff = (
            (avg_diff / same_site_avg) * 100 if same_site_avg != 0 else float("inf")
        )
        print(f"  Average Difference (Different - Same): {avg_diff:.4e} {output_unit}")
        if avg_percent_diff != float("inf"):
            print(f"  Average Percentage Difference: {avg_percent_diff:.2f}%")
        else:
            print(
                "  Average Percentage Difference: Infinite (Same Site Average is zero)"
            )

    if same_site_95p is not None and different_site_95p is not None:
        p95_diff = different_site_95p - same_site_95p
        # Avoid division by zero if same_site_95p is zero
        p95_percent_diff = (
            (p95_diff / same_site_95p) * 100 if same_site_95p != 0 else float("inf")
        )
        print(
            f"  95th Percentile Difference (Different - Same): {p95_diff:.4e} {output_unit}"
        )
        if p95_percent_diff != float("inf"):
            print(f"  95th Percentage Difference: {p95_percent_diff:.2f}%")
        else:
            print(
                "  95th Percentage Difference: Infinite (Same Site 95th Percentile is zero)"
            )

    print(f"\n--- Analysis Complete for '{name}' ---")

    return all_combinations_stats, same_site_stats, different_site_stats


def plot_speed_histogram(df: pl.DataFrame, name: str, output_unit: str = "ns"):
    plot_data = df.with_columns(
        pl.concat_str(
            [pl.col("source_site"), pl.lit(" -> "), pl.col("destination_site")]
        ).alias("combination")
    )
    if not plot_data.is_empty():
        fig, ax = plt.subplots(figsize=(12, 7))

        ax.bar(plot_data["combination"], plot_data[f"average_{output_unit}"])

        ax.set_xlabel("Site Combination")
        ax.set_ylabel("Average Speed (ns)")
        ax.set_title(f"Average Speed by Site Combination for '{name}'")
        plt.xticks(rotation=45, ha="right")  # Rotate labels to prevent overlap
        plt.grid(axis="y", linestyle="--", alpha=0.7)  # Add a horizontal grid
        plt.tight_layout()  # Adjust layout to prevent labels from being cut off
        plt.show()
    else:
        print("No data found for plotting combinations.")


def plot_request_statistics(
    same_site_stats: pl.DataFrame,
    different_site_stats: pl.DataFrame,
    topic: str,
    name: str,
    output_unit: str = "ms",
    be_latency: int = 15,
    spain_latency: int = 20,
    filename: str = "default.pdf",
):
    """
    Generates plots to visualize request statistics for same-site and different-site requests.

    Args:
        same_site_stats: Polars DataFrame containing statistics for same-site requests.
        different_site_stats: Polars DataFrame containing statistics for different-site requests.
        average_col: Name of the average column in the DataFrames.
        median_col: Name of the median column in the DataFrames.
        percentile_col: Name of the 95th percentile column in the DataFrames.
        min_col: Name of the minimum column in the DataFrames.
        max_col: Name of the maximum column in the DataFrames.
        std_col: Name of the standard deviation column (expected in same_site_stats).
                 Note: Based on your provided code, std is NOT calculated for different_site_stats.
        count_col: Name of the count column in the DataFrames.
    """
    # Use the converted value column for aggregations
    value_col_name = f"value_{output_unit}"
    average_col = f"average_{output_unit}"
    median_col = f"median_{output_unit}"
    percentile_col = f"percentile_95_{output_unit}"
    min_col = f"min_{output_unit}"
    max_col = f"max_{output_unit}"
    std_col = f"std_dev_{output_unit}"
    count_col = "count"

    # --- Same-site requests visualization ---

    print("\nGenerating plots for same-site requests...")

    # Convert to pandas for easier plotting with seaborn/matplotlib
    # This uses the DataFrame as is after your Polars aggregation
    same_site_stats_pd = same_site_stats

    if not different_site_stats.is_empty():
        # Convert to pandas
        different_site_stats_pd = pd.DataFrame(different_site_stats)  # .to_pandas()
        # Convert columns to appropriate names
        different_site_stats_pd.columns = [
            "source_site",
            "destination_site",
            average_col,
            median_col,
            percentile_col,
            min_col,
            max_col,
            count_col,
        ]

        # Combine source and destination for plotting
        different_site_stats_pd["source_destination"] = (
            different_site_stats_pd["source_site"]
            + " -> "
            + different_site_stats_pd["destination_site"]
        )
        fig_diff, axes = plt.subplots(nrows=1, ncols=2, figsize=(15, 15))
        fig_diff.suptitle(f"Request Statistics (${topic} - ${name})", fontsize=16)
        fig_diff.tight_layout(pad=4.0)

        # Plotting statistics with hue and legend=False to address FutureWarning
        sns.barplot(
            ax=axes[0],
            x="source_site",
            y=average_col,
            data=same_site_stats_pd,
            palette="viridis",
            hue="source_site",
            legend=False,
        )
        axes[0].set_title(f"Average same site request ({average_col})")
        axes[0].tick_params(axis="x", rotation=45)
        axes[0].set_xlabel("")  # Remove redundant x-label
        axes[0].set_ylabel(average_col)

        # Plotting statistics with hue and legend=False to address FutureWarning
        sns.barplot(
            ax=axes[1],
            x="source_destination",
            y=average_col,
            data=different_site_stats_pd,
            palette="plasma",
            hue="source_destination",
            legend=False,
        )
        axes[1].set_title(f"Average cross site requests ({average_col})")
        axes[1].tick_params(axis="x", rotation=45)
        axes[1].set_xlabel("")
        axes[1].set_ylabel(average_col)
    else:
        # Create a single subplot if different site data is empty
        fig, axes = plt.subplots(nrows=1, ncols=1, figsize=(10, 8))
        # fig.suptitle(f'Same-site Request Statistics ({topic} - {name})', fontsize=16)
        fig.tight_layout(pad=4.0)

        # Plot same-site data of eu-be (axes[0])
        # Belgium average latency
        be_average_latency = same_site_stats_pd.filter(
            pl.col("source_site") == "eu-be"
        )[average_col].to_numpy()
        # Spain average latency
        spain_average_latency = same_site_stats_pd.filter(
            pl.col("source_site") == "eu-spain"
        )[average_col].to_numpy()[0]

        # Plotting the latency on two axes
        axes.axhline(
            y=be_latency,
            color="blue",
            linestyle="--",
            label=f"Belgium Latency ({be_latency}{output_unit})",
        )

        axes.axhline(
            y=spain_latency,
            color="red",
            linestyle="--",
            label=f"Spain Latency ({spain_latency}{output_unit})",
        )

        # Plotting the belgium average latency
        sns.barplot(
            ax=axes,
            x="source_site",
            y=average_col,
            data=same_site_stats_pd,
            palette="viridis",
            hue="source_site",
            legend=False,
        )

        plt.legend()

        plt.savefig(filename + "_same_site.pdf", format="pdf", bbox_inches="tight")
        plt.show()


def comparison_plot(
    same_site_stats_with: pl.DataFrame,
    different_site_stats_with: pl.DataFrame,
    same_site_stats_without: pl.DataFrame,
    different_site_stats_without: pl.DataFrame,
    topic: str,
    name: str,
    output_unit: str = "ms",
    be_latency: int = 15,
    spain_latency: int = 20,
    filename: str = "default.pdf",
):
    """
    Generates plots to visualize request statistics for same-site and different-site requests.

    Args:
        same_site_stats: Polars DataFrame containing statistics for same-site requests.
        different_site_stats: Polars DataFrame containing statistics for different-site requests.
        average_col: Name of the average column in the DataFrames.
        median_col: Name of the median column in the DataFrames.
        percentile_col: Name of the 95th percentile column in the DataFrames.
        min_col: Name of the minimum column in the DataFrames.
        max_col: Name of the maximum column in the DataFrames.
        std_col: Name of the standard deviation column (expected in same_site_stats).
                 Note: Based on your provided code, std is NOT calculated for different_site_stats.
        count_col: Name of the count column in the DataFrames.
    """
    # Use the converted value column for aggregations
    value_col_name = f"value_{output_unit}"
    average_col = f"average_{output_unit}"
    median_col = f"median_{output_unit}"
    percentile_col = f"percentile_95_{output_unit}"
    min_col = f"min_{output_unit}"
    max_col = f"max_{output_unit}"
    std_col = f"std_dev_{output_unit}"
    count_col = "count"

    # --- Same-site requests visualization ---

    print("\nGenerating plots for same-site requests...")

    # Convert to pandas for easier plotting with seaborn/matplotlib
    # This uses the DataFrame as is after your Polars aggregation
    same_site_stats_with_pd = same_site_stats_with
    same_site_stats_without_pd = same_site_stats_without

    if not different_site_stats_with.is_empty():
        # Convert to pandas
        different_site_stats_pd = pd.DataFrame(
            different_site_stats_with
        )  # .to_pandas()
        # Convert columns to appropriate names
        different_site_stats_pd.columns = [
            "source_site",
            "destination_site",
            average_col,
            median_col,
            percentile_col,
            min_col,
            max_col,
            count_col,
        ]

        # Combine source and destination for plotting
        different_site_stats_pd["source_destination"] = (
            different_site_stats_pd["source_site"]
            + " -> "
            + different_site_stats_pd["destination_site"]
        )
        fig_diff, axes = plt.subplots(nrows=1, ncols=2, figsize=(15, 15))
        fig_diff.suptitle(f"Request Statistics (${topic} - ${name})", fontsize=16)
        fig_diff.tight_layout(pad=4.0)

        # Plotting statistics with hue and legend=False to address FutureWarning
        sns.barplot(
            ax=axes[0],
            x="source_site",
            y=average_col,
            data=same_site_stats_with_pd,
            palette="viridis",
            hue="source_site",
            legend=False,
        )
        axes[0].set_title(f"Average same site request ({average_col})")
        axes[0].tick_params(axis="x", rotation=45)
        axes[0].set_xlabel("")  # Remove redundant x-label
        axes[0].set_ylabel(average_col)

        # Plotting statistics with hue and legend=False to address FutureWarning
        sns.barplot(
            ax=axes[1],
            x="source_destination",
            y=average_col,
            data=different_site_stats_pd,
            palette="plasma",
            hue="source_destination",
            legend=False,
        )
        axes[1].set_title(f"Average cross site requests ({average_col})")
        axes[1].tick_params(axis="x", rotation=45)
        axes[1].set_xlabel("")
        axes[1].set_ylabel(average_col)
    else:
        # Create a single subplot if different site data is empty
        fig, axes = plt.subplots(nrows=1, ncols=2, figsize=(16, 8))
        # fig.suptitle(f'Same-site Request Statistics ({topic} - {name})', fontsize=16)
        fig.tight_layout(pad=4.0)

        # Add a column to distinguish the data sources
        same_site_stats_with_pd = same_site_stats_with_pd.with_columns(
            pl.lit("With middleware").alias("middleware_status")
        )
        same_site_stats_without_pd = same_site_stats_without_pd.with_columns(
            pl.lit("Without middleware").alias("middleware_status")
        )
        # Filter and combine the data for eu-be site
        combined_be_data = pl.concat(
            [
                same_site_stats_with_pd.filter(pl.col("source_site") == "eu-be"),
                same_site_stats_without_pd.filter(pl.col("source_site") == "eu-be"),
            ]
        )

        # Convert to pandas for Seaborn plotting
        combined_be_data_pd = combined_be_data

        # Plotting the latency on two axes
        axes[0].axhline(
            y=be_latency,
            color="red",
            linestyle="--",
            label=f"Belgium Latency ({be_latency}{output_unit})",
        )

        # Plotting the belgium average latency
        sns.barplot(
            ax=axes[0],
            x="middleware_status",  # Use the new column for x-axis
            y=average_col,
            data=combined_be_data_pd,
            palette="viridis",  # Or choose another palette
            # hue="middleware_status", # Hue is not strictly necessary if using the column for x
            legend=False,  # Legend might not be needed if x-axis labels are clear
        )

        axes[0].set_title("Average same site request in Belgium")
        axes[0].tick_params(axis="x", rotation=45)
        axes[0].set_xlabel("")
        axes[0].set_ylabel(average_col)

        ### SPAIN LATENCY PLOT ###

        # Add a column to distinguish the data sources
        same_site_stats_with_pd = same_site_stats_with_pd.with_columns(
            pl.lit("With middleware").alias("middleware_status")
        )
        same_site_stats_without_pd = same_site_stats_without_pd.with_columns(
            pl.lit("Without middleware").alias("middleware_status")
        )

        # Filter and combine the data for eu-be site
        combined_spain_data = pl.concat(
            [
                same_site_stats_with_pd.filter(pl.col("source_site") == "eu-spain"),
                same_site_stats_without_pd.filter(pl.col("source_site") == "eu-spain"),
            ]
        )

        # Convert to pandas for Seaborn plotting
        combined_spain_data_pd = combined_spain_data
        axes[1].axhline(
            y=spain_latency,
            color="purple",
            linestyle="--",
            label=f"Spain Latency ({spain_latency}{output_unit})",
        )
        # Plotting the spain average latency
        sns.barplot(
            ax=axes[1],
            x="middleware_status",  # Use the new column for x-axis
            y=average_col,
            data=combined_spain_data_pd,
            palette="viridis",  # Or choose another palette
            # hue="middleware_status", # Hue is not strictly necessary if using the column for x
            legend=False,  # Legend might not be needed if x-axis labels are clear
        )

        axes[1].set_title("Average same site request in Spain")
        axes[1].tick_params(axis="x", rotation=45)
        axes[1].set_xlabel("")
        axes[1].set_ylabel(average_col)

        plt.savefig(filename + "_same_site.pdf", format="pdf", bbox_inches="tight")
        plt.show()


if __name__ == "__main__":
    # Get the folder path from the command line arguments
    if len(sys.argv) < 2:
        print("Usage: python main.py <folder_path> <topic> <name>")
        exit(1)
    folder_path = sys.argv[1]
    # Load the JSON files from the folder

    if len(sys.argv) < 3:
        # Show the different topics available with their associated names
        topics = set(item.get("topic") for item in data if "topic" in item)
        print("Available topics:")
        for topic in topics:
            names = set(item.get("name") for item in data if item.get("topic") == topic)
            print(f"  Topic: {topic}")
            for name in names:
                print(f"    Name: {name}")
        print("Please specify a topic and name to filter the measures.")
        exit(0)

    topic = sys.argv[2]
    if len(sys.argv) < 4:
        # Show the different names available for the specified topic
        names = set(item.get("name") for item in data if item.get("topic") == topic)
        print(f"Available names for topic '{topic}':")
        for name in names:
            print(f"  Name: {name}")
        print("Please specify a name to filter the measures.")
        exit(0)

    name = sys.argv[3]
    # Load the JSON files from the folder
    data_with = load_folder(folder_path + "middleware/")
    data_without = load_folder(folder_path + "no-middleware/")
    print(
        f"Loaded {len(data_with)} measures with middleware and {len(data_without)} without middleware."
    )

    dataframe_with = get_measures_dataframe(data_with, topic, name)
    dataframe_without = get_measures_dataframe(data_without, topic, name)
    if dataframe_with.is_empty() and dataframe_without.is_empty():
        print("No measures found for the specified topic and name.")
    else:
        # print("Filtered measures:")
        # print(dataframe.head())
        # Analyze the speed data
        all_combinations_stats, same_site_stats_with, different_site_stats_with = (
            analyze_speed_dataframe(dataframe_with, name, output_unit="ms")
        )
        (
            all_combinations_stats_without,
            same_site_stats_without,
            different_site_stats_without,
        ) = analyze_speed_dataframe(dataframe_without, name, output_unit="ms")
        # Plot the histogram of speed values
        # plot_speed_histogram(all_combinations_stats, name, output_unit='ms')
        if len(sys.argv) > 4:
            filename = sys.argv[4]
            plot_request_statistics(
                same_site_stats_with,
                different_site_stats_with,
                topic,
                name,
                "ms",
                filename=filename + "_" + topic + "_" + name,
            )
        else:
            comparison_plot(
                same_site_stats_with,
                different_site_stats_with,
                same_site_stats_without,
                different_site_stats_without,
                topic,
                name,
                output_unit="ms",
                filename=f"{topic}_{name}_comparison",
            )

    print("Data loaded successfully.")
