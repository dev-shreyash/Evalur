package com.evalur;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@Disabled("Requires live PostgreSQL with PgVector and environment configuration; integration environment only")
@SpringBootTest
class EvalurApplicationTests {

	@Test
	void contextLoads() {
	}

}
